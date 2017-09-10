"use strict"

var assert = require('assert'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    strings = require('../res/strings-en.json')

var MessengerUtilModule = require("../src/facebook-messenger-utils.js")

describe("Facebook Messenger Util module", function() {
    var sender = "1234",
        util = new MessengerUtilModule()

    before(function() {

    })

    after(function() {

    })

    describe("responseBuilder()", function(done) {
        var responseDefault = strings.responseDefault, 
            responseHelp = strings.responseHelp,
            responseAbout = strings.responseAbout

        it('when no match, should return "default" message', function(done) {
            assert.deepEqual(responseDefault, util.responseBuilder(sender, ""))
            assert.deepEqual(responseDefault, util.responseBuilder(sender, "chicken about"))
            assert.deepEqual(responseDefault, util.responseBuilder(sender, "chicken search"))
            done()
        })
        it('when "About" is first term, should return "about" message', function(done) {
            assert.deepEqual(responseAbout, util.responseBuilder(sender, "about"))
            assert.deepEqual(responseAbout, util.responseBuilder(sender, "about me you"))
            done()
        })

        it('when "Search is first term', function(done) {
            done()
        })
    })

})