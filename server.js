var express     = require('express');
var LEX         = require('letsencrypt-express');
var app         = express();
var bcrypt      = require('bcrypt')
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var jwt         = require('jsonwebtoken');
var fs         = require('fs');
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
    if (req.url === '/') {
      req.url = "/login" + req.url;
      next();
      return;
    }

    req.url = "/unauth" + req.url;
    next();
    return;
  }

  req.url = "/auth" + req.url;
  next();
});

// Unauthenticated routes
// e.g. GET or POST https://localhost:62686/[etc] with no x-access-token
app.all('/unauth/*', function(req, res) {
  req.url = req.url.substring(7);   // chop off '/unauth'
  handlers.unauth(req, res);
});

// Authenticate User
// e.g. POST https://localhost:62686/
app.post('/login', function(req, res) {
  // Confirm hashed password
  var username = req.body.name;
  var password = req.body.password;

  fs.readFile(config.passwordFile, 'utf8', function (err, data) {
    if (!data) {
      res.json({ success: false, message: 'Server configuration issue #1.'});   // unable to locate password file
      return;
    }

    var passwords = JSON.parse(data);
    if (!passwords) {
      res.json({ success: false, message: 'Server configuration issue #2.'});   // unable to parse password file
      return;
    }

    if (!passwords.hasOwnProperty(username)) {
      res.json({ success: false, message: 'Authentication failed. User not found.' });
      return;
    };

    var storedPassword = passwords[username];

    var asyncDecode = function(rolesTodo) {
      if (rolesTodo.length == 0) {
        res.json({ success: false, message: 'Authentication failed. Bad password.' });
        return;
      }

      var role = rolesTodo.pop();
      bcrypt.compare(password+role, storedPassword, function(err, matched) {
        if (!matched) {
          asyncDecode(rolesTodo);
          return;
        }

        var token = jwt.sign({ name: username, password: password, role: role },
          app.get('secret'), { expiresIn: config.expiresIn });

        res.json({
          success: true,
          message: '',
          token: token
        });
      })
    };

    asyncDecode(Array.from(config.roles));    // it mutates the array so use a copy
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
      console.log('User: ' + req.decoded.name + ' logged in with role: ' + req.decoded.role);
      next();
    }
  });
});

// Authenticated route
// e.g. GET or POST https://localhost:62686/[etc] with auth token
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

console.log("The backing Cayley instance must be running at http://" + config.internal_url + ':' + config.internal_port);
