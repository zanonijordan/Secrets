//jshint esversion:6
require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
const encrypt = require('mongoose-encryption')
const md5 = require('md5')
const bcrypt = require('bcrypt')
const saltRounds = 10;
const app = express()

app.use(express.static('public'))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({
  extended: true
}));
try {
  mongoose.connect('mongodb://localhost:27017/userDB', {
    useNewUrlParser: true
  })
  console.log(('Mongodb connected'));
} catch {
  console.log(error);
}

const userSchema = new mongoose.Schema({
  email: String,
  password: String
})

//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']})

const User = new mongoose.model('User', userSchema)
// -----------------------Route
// ---------Home
app.route('/')
  .get(function(req, res) {
    res.render('home')
  })

// -------------LOGIN
app.route('/login')
  .get(function(req, res) {
    res.render('login')
  })
  .post(function(req, res){

    const username = req.body.username
    const password = req.body.password

    User.findOne({email: username}, function(err,foundUser){
      if(err){
        console.log(err);
      } else {
        if(foundUser){
          bcrypt.compare(password, foundUser.password, function(err, result) {
          if(result === true){
            res.render('secrets')
          } else {
            console.log(err);
          }
          });
        }
      }
    })
  })

// ---------------REGISTER
app.route('/register')
  .get(function(req, res) {
    res.render('register')
  })
  .post(function(req, res) {

    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
      const newUser = User({
        email: req.body.username,
        password: hash
      })
      newUser.save(function(err){
        if(err){
          console.log(err);
        }else {
          res.render('secrets')
        }
      })
    });


  })

// ----------------------Listen
app.listen(3000, function(req, res) {
  console.log('Running on port 3000');
})
