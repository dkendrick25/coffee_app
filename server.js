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
    if(user){
      console.log('pick a diff username');
      resp.send({"status": "failed", "message": "user name is taken"});
    }else{
      // save username and pswd to the database
      //bcrypt user password
      bcrypt.hash(crendentails.password, 10, function(err, encryptedPassword) {
        if (err) {
          console.error(err.message);
          return;
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
          res.json({"status": "ok"});
        });
      });
    }
  });
});

app.post('/login', function(req, resp) {
  var crendentails = req.body;
  User.findById(crendentails.username, function(err, user) {
    if (err) {
      console.log(err.message);
      return;
    }
    bcrypt.compare(crendentails.password, user.password, function(err, matched) {
      if (err) {
        resp.send('Password did not match');
      }
      if (matched) {
        var token = randToken.generate(64);
        user.update(
          {$push: {authenticationTokens: token} },
          function(err, user) {
            if(err) {
              resp.send({"status": "fail", "message": "Invaild username or password"});
            }
            resp.send({"status": "ok", "token": token});
          }
        );
      }
    });
  });
});
//need to fix
app.post('/orders', function(req, resp){
  var token = req.body.token;
  User.findOne({authenticationTokens: token}, function(err, user){
    if (err) {
      req.send(err.message);
    }
    user.update(
      {$push: {orders: req.body.order}},
      function(err, user) {
        if (err) {
          resp.send({"status": "fail", "message": "missing required field"});
        }
        resp.send({"status": "ok"});
      }
    );

  });
});

app.get("/orders", function(req, resp) {
  var token = req.query.token;
  User.findOne({authenticationTokens: token}, function(err, user){
    if (err) {
      req.send(err.message);
    }
    resp.send(user.orders);
  });
});


app.listen(8000, function(){
  console.log("Listening on port 8000");
});
