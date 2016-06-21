var bcrypt      = require('bcrypt')

module.exports = {
  // To enable SSL with Let's Encrypt, set the $LEX environment variable (to anything).
  // Also set $LEX_DOMAIN to the server you are encrypting and and $LEX_EMAIL
  // to your email address.
  // If $LEX is not set then we run on http instead of https.
  'lex'             : process.env.LEX ? true : false,
  'lex_domain'      : process.env.LEX_DOMAIN || 'example.com',
  'lex_email'       : process.env.LEX_EMAIL || 'user@example.com',

  // Used by JWT to make session tokens.
  'secret'          : process.env.CAYLEY_SECRET || 'faunacrankylepidopteroso',

  // The port we run on.
  'port'            : process.env.CAYLEY_EXT_SERVER_PORT ? parseInt(process.env.CAYLEY_EXT_SERVER_PORT) : 62686,

  // The IP/port that Cayley's HTTP API runs on.
  'internal_url'             : process.env.CAYLEY_INT_SERVER_IP || "localhost",
  'internal_port'            : process.env.CAYLEY_INT_SERVER_PORT ? parseInt(process.env.CAYLEY_INT_SERVER_PORT) : 64321,

  // Duration for which the login token is valid.
  'expiresIn'       : process.env.CAYLEY_AUTH_EXPIRES_IN || '24h',

  // Name of password file.  Suffix is optional if .js or .json.
  // The ./ if specifying a relative path is not.
  'passwordFile'    : process.env.PASSWORD_FILE || './passwords',

  // List of roles understood by `auth` function.
  'roles'           : [ 'admin', 'empl' ]
};
