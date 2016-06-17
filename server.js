var express     = require('express');
var app         = express();
var bcrypt      = require('bcrypt')
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var jwt         = require('jsonwebtoken');
var config      = require('./config');

var port = config.port;
app.set('secret', config.secret);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(morgan('dev'));

app.listen(port);
console.log('Magic happens at http://localhost:' + port);

// Unauthenticated route : GET http://localhost:62686/
app.get('/', function(req, res) {
  // TODO: Fill in with unauthorized access behavior.
  res.json({ message: 'Unauthenticated request!' });
});

// Authenticate User
// POST http://localhost:62686/auth
app.post('/auth', function(req, res) {
  // Confirm hashed password
  var username = req.body.name;
  var password = req.body.password;

  if (username !== config.username) {
    res.json({ success: false, message: 'Authentication failed. User not found.' });
    return;
  }

  bcrypt.compare(password, config.bcrypt_password, function(err, matched) {
    if (!matched) {
      res.json({ success: false, message: 'Authentication failed. Wrong password.' });
      return;
    }

    var token = jwt.sign({ name: username, password: password }, app.get('secret'), {
      expiresIn: config.expiresIn
    });

    res.json({
      success: true,
      message: '',
      token: token
    });
  });
});

// Verify the token
app.use(function(req, res, next) {
  // Look for token in url parameters or post parameters.
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  if (!token) {
    return res.status(403).send({
        success: false,
        message: 'No token provided.'
    });
  }

  jwt.verify(token, app.get('secret'), function(err, decoded) {
    if (err) {
      return res.json({ success: false, message: 'Bad authentication token.' });
    } else {
      req.decoded = decoded;
      next();
    }
  });
});

// Authenticated route : GET http://localhost:62686/
app.get('/su', function(req, res) {
  // TODO: Fill in with authorized access behavior.
  res.json({ message: 'Run authenticated command!' });
});
