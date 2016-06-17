var bcrypt      = require('bcrypt')

module.exports = {
    'secret'          : process.env.CAYLEY_SECRET || 'faunacrankylepidopteroso',
    'port'            : process.env.CAYLEY_SERVER_PORT ? parseInt(process.env.CAYLEY_SERVER_PORT) : 62686,
    'expiresIn'       : process.env.CAYLEY_AUTH_EXPIRES_IN || '24h',
    'username'        : process.env.CAYLEY_USERNAME || 'admin',
    'bcrypt_password' : process.env.CAYLEY_BCRYPT_PASSWD ||
        bcrypt.hashSync('password', 10 /* # salt rounds */)
};
