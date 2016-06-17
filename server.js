var express     = require('express');
var LEX         = require('letsencrypt-express');
var app         = express();
var bcrypt      = require('bcrypt')
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var jwt         = require('jsonwebtoken');
var config      = require('./config');
var handlers    = require('./handlers');

app.set('secret', config.secret);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.text());

app.use(morgan('dev'));

app.use(function(req, res, next) {
  // Look for token in url parameters or post parameters.
  // If none is found then run the unauth path.
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  if (!token) {
    req.url = "/unauth" + req.url;
    next();
    return;
  }

  req.url = "/auth" + req.url;
  next();
});

// Unauthenticated routes
// e.g. GET or POST https://localhost:62686/
app.all('/unauth/*', function(req, res) {
  req.url = req.url.substring(7);   // chop off '/unauth'
  handlers.unauth(req, res);
});

// Authenticate User
// e.g. POST https://localhost:62686/auth
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

// Authenticated route
// e.g. GET or POST https://localhost:62686/
app.all('/auth/*', function(req, res) {
  req.url = req.url.substring(5);   // chop off '/auth'
  handlers.auth(req, res);
});

if (config.lex) {
  console.log("Configuring SSL");

  // Maintain SSL certs with Lets Encrypt.
  var lex = LEX.create({
    configDir: require('os').homedir() + '/letsencrypt/etc',
    approveRegistration: function (hostname, approve) { // leave `null` to disable automatic registration
      console.log("hostname = " + hostname);
      if (hostname === config.lex_domain) { // Or check a database or list of allowed domains
        approve(null, {
          domains: [config.lex_domain]
        , email: config.lex_email
        , agreeTos: true
        });
      }
    }
  });

  lex.onRequest = app;

  lex.listen([] /* unsecured ports */, [config.port] /* secured ports */, function () {
    var protocol = ('requestCert' in this) ? 'https': 'http';
    console.log("Listening at " + protocol + '://localhost:' + this.address().port);
  });
} else {
  console.log('Server launched at http://localhost:' + config.port);
  console.log("WARNING: SSL is NOT enabled!  This is only appropriate for testing.\n" +
    "Set $LEX to enable Let's Encrypt.  See config.js for more.");
  app.listen(config.port);
}
