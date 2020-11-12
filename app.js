'use strict';

require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const  strGen = require('@supercharge/strings');
const https = require('https');
const querystring = require('qs');
const path = require('path');
var session = require('express-session')
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
var cookieParser = require('cookie-parser');

const app = express();

app.engine('pug', require('pug').__express)
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({secret: process.env.SESSION_SECRET}));
app.use('/boats', require('./boats'));
app.use('/owners', require('./owners'));
app.set('view engine', 'pug');

/************************************************
 *   Welcome Page
************************************************/
app.get('/', function(req,res) {
  req.session.state = strGen.random()
  const myUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  myUrl.searchParams.append("response_type", "code")
  myUrl.searchParams.append("client_id", process.env.CLIENT_ID)
  myUrl.searchParams.append("redirect_uri", "http://localhost:8080/oauth")
  //myUrl.searchParams.append("redirect_uri", "https://hw7-robinree.ue.r.appspot.com/oauth")
  myUrl.searchParams.append("state", req.session.state)
  myUrl.searchParams.append("scope", "profile")

  var context = {
    "url": myUrl
  }
  
  res.render('home', context);
});

/************************************************
 *   User Info Page (Redirect after OAuth)
************************************************/
app.get('/oauth', function(req,res) {

  var context = {
    "state": req.session.state,
    "data": JSON.stringify(req.query)
  }

  //If token exists
  if(req.session.token) {
    const google_options = {
      hostname: 'people.googleapis.com',
      path: '/v1/people/me?personFields=names',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + req.session.token
      }
    }

    var goog_str_resp = ''
    const get_req = https.request(google_options, goog_res => {      
      goog_res.on('data', d => { goog_str_resp += d });

      goog_res.on('end', function () {
        context.firstName = JSON.parse(goog_str_resp).names[0].givenName 
        context.lastName = JSON.parse(goog_str_resp).names[0].familyName
        res.render('userInfo', context);
      });
    });
    get_req.end()
    return
  }

  if(req.session.state == req.query.state) {
    var resp_data = ''

    var data = querystring.stringify({
      code: req.query.code,
      client_id:process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: "http://localhost:8080/oauth",
      //redirect_uri:"https://hw7-robinree.ue.r.appspot.com/oauth",
      grant_type: "authorization_code"
    })
  
    var options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data)
      }
    };
  
    var str_resp = ''
    var request = https.request(options, response => {
      response.on('data', chunk => { str_resp += chunk });
      
      response.on('end', function () {
        console.log(str_resp)
        req.session.token = JSON.parse(str_resp).access_token
        req.session.jwt = JSON.parse(str_resp).id_token
        context.jwt = req.session.jwt
        //Create GET request to Google People API with Authorization header set to access token
        const google_options = {
          hostname: 'people.googleapis.com',
          path: '/v1/people/me?personFields=names',
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + JSON.parse(str_resp).access_token
          }
        }
        //process.env.ACCESS = JSON.parse(str_resp).access_token
        //context.environmentVar = process.env.ACCESS
  
        var goog_str_resp = ''
        const get_req = https.request(google_options, goog_res => {      
          goog_res.on('data', d => { goog_str_resp += d });
          
          goog_res.on('end', function () {
            context.firstName = JSON.parse(goog_str_resp).names[0].givenName 
            context.lastName = JSON.parse(goog_str_resp).names[0].familyName
            res.render('userInfo', context);
          });
        });
        get_req.end()
      });
    });
    request.write(data);
    request.end();
  }
  else {
    context.incorrectState = "State Doesn't match"
    res.render('userInfo', context);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(process.env.PORT || 8080, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

module.exports = app;
