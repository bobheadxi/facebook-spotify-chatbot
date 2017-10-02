"use strict"

var assert = require('assert'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    strings = require('../res/strings-en.json')

var BackendModule = require('../src/backend-module.js'),
    MessengerUtilModule = require('../src/facebook-messenger-utils.js')

describe("Backend module", function() {
    var messengerUtilStub,
        backend

    beforeEach(function() {
        messengerUtilStub = sinon.createStubInstance(MessengerUtilModule)
        backend = new BackendModule(messengerUtilStub)
    })

    afterEach(function() {

    })

    describe("Handle events", function() {
        describe("messages", function() {
            it("handle outstanding song request if existing", function(done) { 
                setupStub = sinon.stub(SpotifyModule.prototype, 'hasSongRequest').callsFake(
                    function fakeSetup() {return false}
                )
            })
        })

        describe("events handling", function() { 

        })
    })

})