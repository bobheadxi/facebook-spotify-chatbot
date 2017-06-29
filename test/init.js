'use strict'

const cli = require('heroku-cli-util')         // Load heroku-cli-util helpers
//const nock = require('nock')                   // Load nock
cli.raiseErrors = true                         // Fully raise exceptions
//nock.disableNetConnect()                       // Disable HTTP connections
global.commands = require('../index').commands // Load plugin commands

process.env.TZ = 'UTC'                         // Use UTC time always
//require('mockdate').set(new Date())            // Freeze time (optional)
process.stdout.columns = 80                    // Set screen width for consistent wrapping
process.stderr.columns = 80                    // Set screen width for consistent wrapping
