var bcrypt      = require('bcrypt');
var config      = require('./config.js');
var fs          = require("fs");

if (process.argv.length != 5) {
  console.log("Usage: " + process.argv[1] + " username password role");
  return;
}

var user = process.argv[2];
var pass = process.argv[3];
var role = process.argv[4];

if(config.roles.indexOf(role) == -1) {
  console.log("ERROR: Invalid role.");
  return;
}

var currentPasses = null;

try {
  currentPasses = require(config.passwordFile);
} catch(e) {
  if(e.code === "MODULE_NOT_FOUND") {
    console.log("WARNING: Creating new password file: " + config.passwordFile);
    currentPasses = {};
  } else {
    console.log("ERROR: Problem opening password file: " + config.passwordFile);
    console.log();
    return;
  }
};

var existed = currentPasses.hasOwnProperty(user);

currentPasses[user] = bcrypt.hashSync(pass+role, 10 /* # salt rounds */);
fs.writeFile(config.passwordFile.endsWith('.json') ? config.passwordFile : config.passwordFile + '.json',
              JSON.stringify(currentPasses, null, 2), function(err) {
  if (err) {
    console.log("ERROR: Failed to write password file: " + err);
    return;
  }
  console.log("User " + existed ? "updated." : "added.");
});
