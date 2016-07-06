var express = require('express');
var app = express();
var session = require('express-session');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt');

var randToken = require('rand-token');


var mongoose = require('mongoose');
var User = require('./user');

app.use(bodyParser.json());

mongoose.connect('mongodb://localhost/users');


app.get('/options', function(req, resp){
  resp.send([
    "Extra coarse",
    "Coarse",
    "Medium-coarse",
    "Medium",
    "Medium-fine",
    "Fine",
    "Extra fine"
  ]);
});

app.post('/signup', function(req, resp) {
  var crendentails = req.body;
  var encryptedPassword;

  User.findById(crendentails.username, function(err, user){
    if(err){
      console.error(err.message);
      return;
    }
    // username exist in the DB and use needs to pick a different username
    if(user) {
      console.log('pick a diff username');
      resp.send({"status": "failed", "message": "user name is taken"});
    } else {
      // save username and pswd to the database
      //bcrypt user password
      bcrypt.hash(crendentails.password, 10, function(err, encryptedPassword) {
        if (err) {
          resp.status(500);
          resp.json({
            status: "fail",
            message: "Password hash has failed" + err.message
          });
        }
        console.log('Password:', crendentails.password);
        console.log('Encrypted password:', encryptedPassword);
        User.create({
          _id: crendentails.username,
          password: encryptedPassword
        }, function(err, user){
          if(err){
            return console.log(err);
          }
          // saved
          res.send({"status": "ok"});
        });
      });
    }
  });
});

app.post('/login', function(req, resp) {
  var crendentails = req.body;
  User.findById(crendentails.username, function(err, user) {
    if (!user) {
      resp.json({status: 'fail', message: "invaild username or password"});
    }
    bcrypt.compare(crendentails.password, user.password, function(err, matched) {
      if (err || !matched) {
        resp.send({"status": "fail", "message": "Invaild username or password"});
      }
      if (matched) {
        var token = randToken.generate(64);
        //user.authenticationTokens.push(token);
        //user.save(function(err) {...})
        user.update(
          {$push: {authenticationTokens: token} },
          function(err, user) {
            if(err) {
              resp.send({"status": "fail", "message": "Invaild username or password"});
            }
            resp.json({status: "ok", token: token});
          }
        );
      }
    });
  });
});
//checks to see if user is logged in
function authRequired(request, response, next) {
  var token = request.query.token || request.body.token;
  User.findOne({authenticationTokens: token}, function(err, user){
    request.user = user;
    if (err) {
      request.send(err.message);
      return;
    }

  if(user) {
    next();
  } else {
    response.json({message: 'please login'});
  }
  });
}

app.post('/orders', authRequired, function(req, resp){
  // var token = req.body.token;
  // if(!token){
  //   resp.json({status: 'failed', message: 'please login'});
  //   return;
  // }
  //
  // User.findOne({authenticationTokens: token}, function(err, user){
  //   if (!user) {
  //     req.send({"status": "fail", "message": "user is not authorized"});
  //   }
    //user.orders.push(info.order);
    //user.save(function(err){...})
    req.user.update(
      {$push: {orders: req.body.order}},
      function(err, user) {
        if (err) {
          //to make error messages more readable
           var validationErrors = [];
          for (var key in err.errors) {
            validationErrors.push(err.errors[key].message);
          }
          resp.send({"status": "fail", "message": "order failed" + err.message + ". " + validationErrors.join(" ")});
          return;
        }
        resp.send({"status": "ok"});
      }
    );

  // });
});

app.get("/orders", authRequired, function(req, resp) {
  // var token = req.query.token;
  // User.findOne({authenticationTokens: token}, function(err, user){
  //   if (err) {
  //     req.send(err.message);
  //   }
    resp.send(req.user.orders);
  // });
});


app.listen(8000, function(){
  console.log("Listening on port 8000");
});
