var express = require('express');
var app = express();
var session = require('express-session');
var bodyParser = require('body-parser');
var bcrypt = require('my-bcrypt');
var cors = require('cors');
var stripe = require('stripe')('sk_test_4QMlsO2oj4cgM6qebUI2GMZ7');
var mongoCreds = require('./mongo_creds.json');

app.use(cors());
var randToken = require('rand-token');


var mongoose = require('mongoose');
var User = require('./user');

app.use(bodyParser.json());

// mongoose.connect('mongodb://localhost/users');
mongoose.connect('mongodb://' + mongoCreds.username + ":" + mongoCreds.password + "@ds025263.mlab.com:25263/coffee_app");

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
  var credentials = req.body;
  var encryptedPassword;

  User.findById(credentials.username, function(err, user){
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
      bcrypt.hash(credentials.password, 10, function(err, encryptedPassword) {
        if (err) {
          resp.status(500);
          resp.json({
            status: "fail",
            message: "Password hash has failed" + err.message
          });
        }
        console.log('Password:', credentials.password);
        console.log('Encrypted password:', encryptedPassword);
        User.create({
          _id: credentials.username,
          password: encryptedPassword
        }, function(err, user){
          if(err){
            return console.log(err);
          }
          // saved
          resp.send({"status": "ok"});
        });
      });
    }
  });
});

app.post('/login', function(req, resp) {
  var credentials = req.body;
  User.findById(credentials.username, function(err, user) {
    if (!user) {
      resp.json({status: 'fail', message: "invaild username or password"});
    }
    bcrypt.compare(credentials.password, user.password, function(err, matched) {
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
});

app.get("/orders", authRequired, function(req, resp) {
    resp.send(req.user.orders);
});
//stripe functionality
app.post('/charge', function(request, response) {
  var amount = request.body.amount;
  var token = request.body.token;
  console.log(token);

  // make the charge using the credit card associated
  // with token
  stripe.charges.create({
    amount: amount,
    currency: 'usd',
    source: token
  }, function(err, charge) {
    if (err) {
      response.json({
        status: 'fail',
        error: err.message
      });
      return;
    }
    response.json({ status: 'ok', charge: charge });
  });
});



app.listen(8000, function(){
  console.log("Listening on port 8000");
});
