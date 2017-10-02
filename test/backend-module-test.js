"use strict"

var assert = require('assert'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    strings = require('../res/strings-en.json')

var BackendModule = require('../src/backend-module.js'),
    MessengerUtilModule = require('../src/facebook-messenger-utils.js'),
    SpotifyModule = require('../src/spotify-module.js'),
    SpotifyWebApi = require("spotify-web-api-node")

describe("Backend module", function() {
    var setupStub,
        request,
        backend

    beforeEach(function() {
        var spotifyApiStub = sinon.createStubInstance(SpotifyWebApi)
        setupStub = sinon.stub(SpotifyModule.prototype, 'setupCredentials').callsFake(
            function fakeSetup() {}
        )
        var spotifyModule = new SpotifyModule(spotifyApiStub)
        var util = new MessengerUtilModule(spotifyModule)
        backend = new BackendModule(util)
    })

    afterEach(function() {
        setupStub.restore();
    })

    describe("Handle events", function() {
        var events,
            event
        beforeEach(function() {
            events = []
            event = {}
            event.postback = {}
            event.postback.payload = {}
            event.postback.payload.sender= {}
        })

        // TODO: proper asserts
        describe("postback", function() { 
            it("preview request", function(done) { 
                event.postback.payload.sender.id = "1234"
                event.postback.payload.type = "preview"
                event.postback.payload.url = "mp3-preview"
                event.postback.payload.name = "blah"
                event.postback.payload.artist = "bleh"
                events.push(event)

                backend.handleMessagingEvents(JSON.stringify(events))
                done()
            })

            it("song request", function(done) { 
                event.postback.payload.sender.id = "1234"
                event.postback.payload.type = "request"
                event.postback.payload.id = "1234"
                event.postback.payload.name = "Modest Mouse"
                event.postback.payload.artist = "Modest Mouse"
                event.postback.payload.url = "www.google.com"
                events.push(event)

                backend.handleMessagingEvents(JSON.stringify(events))
                done()
            })

            it("approve request", function(done) { 
                event.postback.payload.sender.id = "1234"
                event.postback.payload.type = "approve"
                //todo
                events.push(event)

                backend.handleMessagingEvents(JSON.stringify(events))
                done()
            })

            it("get started", function(done) {
                event.postback.payload.sender.id = "1234"
                event.postback.payload.type = "getstarted"
                events.push(event)
                //todo
                backend.handleMessagingEvents(JSON.stringify(events))
                done()
            })
        })
    })

})