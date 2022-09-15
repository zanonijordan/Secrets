//jshint esversion:6
require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
const app = express()

app.use(express.static('public'))
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(session({
  secret: 'our little secret.',
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
// --------------------Mongoose connection
try {
  mongoose.connect('mongodb://localhost:27017/userDB', {
    useNewUrlParser: true
  })
  console.log(('Mongodb connected'));
} catch {
  console.log(error);
}
// --------------------------userSchema
const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  secret: String
});
userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']})

// ----------------------Passport
const User = new mongoose.model('User', userSchema)
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
  console.log(profile);

  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));
// -----------------------Route
// ---------Home
app.route('/')
  .get(function(req, res) {
    res.render('home')
  })
  // ---------------REGISTER
  app.route('/register')
    .get(function(req, res) {
      res.render('register')
    })
    .post(function(req, res) {

      //passport method
      User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
          console.log(err);
          res.redirect('/register')
        } else {
          passport.authenticate('local')(req, res, function(){
          res.redirect('/secrets')
          })
        }
      })
    })
//-----------Login Google
app.route('/auth/google')
.get(passport.authenticate('google', {

    scope: ['profile']

  }));

app.route('/auth/google/secrets')
.get(passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

// -------------LOGIN
app.route('/login')
  .get(function(req, res) {
    res.render('login')
  })
  .post(function(req, res){
    const user = new User({
      username: req.body.username,
      password: req.body.password
    })
    //req from passaport
    req.login(user, function(err){
      if(err){
        console.log(err);
        res.redirect('/login')
      } else {
        passport.authenticate('local')(req, res, function(){
        res.redirect('/secrets')
        })
      }
    })
  })
// --------------------Logout
app.route('/logout').get(function(req, res){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
})
// -----------------Secrets
app.route('/secrets').get(function(req, res){
  User.find({'secret': {$ne: null}}, function(err, foundUser){
    if(err){
      console.log(err);
    } else {
      if (foundUser){
        res.render('secrets', {usersWithSecrets: foundUser})
      }
    }
  })
})
// ---------------------Submit
app.route('/submit').get(function(req, res){
  if(req.isAuthenticated()){
    res.render('submit')
  } else {
    res.redirect('/login')
  }
}).post(function(req, res){
  const submittedSecret = req.body.secret
  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    } else {
      if(foundUser){
        foundUser.secret = submittedSecret
        foundUser.save(function(){
          res.redirect('/secrets')
        })
      }
    }
  })

})


// ----------------------Listen
app.listen(3000, function(req, res) {
  console.log('Running on port 3000');
})
