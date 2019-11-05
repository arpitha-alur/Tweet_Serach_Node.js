var express = require('express');
var app = express();
var server = require('http').Server(app);
var path = require('path');
var bodyParser = require('body-parser');
var io = require('socket.io')(server);
var Twitter = require('twitter');
var request = require('request');
var mysql = require('mysql');

//connecting with mysql
var connect = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'tweet_db'
});
//Twitter credentials
var client = new Twitter({
  consumer_key: 'arFyv1MCIXVgSfINGlkHyLtpi',
  consumer_secret:'lnowGEnV84t62tXHgOJ9T06xNsQq7UipqZZcKtnY76K65Uovm9',
  access_token_key: '1063335643596681216-lftck0BbcjbuoURYxuR0EjCuWkdwPH',
  access_token_secret: '5EbG7MYSC0Et7ZlpPZKqRHFjlT0d9QKvR9tXUvnoEThs2'
});

server.listen(3000);
console.log("server listening at port 3000");

app.get('/', function (req, res) {
  res.set({
    'Access-Control-Allow-Origin': '*'
  });
  return res.redirect('/public/index.html');
});

app.use('/public', express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
  extended: true
}));

io.on('connection', function (socket) {
  //default test event 
  socket.emit('welcome', {
    data: 'welcome'
  });
  //keyword event handled
  socket.on('keyword', function (data) {
    console.log(data);
    var keyword = data.keyword;
    var stream = client.stream('statuses/filter', {
      track: keyword
    });

    stream.on('data', function (event) {
      var tweet = event.text;
      var user = event.user.name;

      var insert_R = 'INSERT INTO tweet_repo(keyword,user,tweet) VALUE(?,?,?)';
      connect.getConnection(function (err, connection) {
        connection.query(insert_R, [keyword, user, tweet], function (err, res) {
          if (err)
            throw err;
          else {
            var content = {
              keyword: keyword,
              user: user,
              tweet: tweet
            }
            console.log("Keyword is ::>> " + keyword);
            console.log("Tweeted by ::>>" + event.user.name);
            console.log("Tweet is ::>>" + event.text);
            console.log('Details added successfully');
            //emitting data through sockets
            socket.emit('livetweets', {
              data: content
            })
          }
        });
        socket.on('stop', function (data) {
          connection.release();
        });
      });
    });

    stream.on('error', function (error) {
      throw error;
    });
  });
});
