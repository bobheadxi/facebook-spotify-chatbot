"use strict"

var assert = require('assert'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    strings = require('../res/strings-en.json')

var backendModule = require('../src/backend-module.js'),
    messenger = require('../src/facebook-messenger-utils.js'),
    spotify = require('../src/spotify-module.js'),
    spotifyApi = require("spotify-web-api-node")

describe("Backend module", function() {
    var setupStub,
        request,
        backend

    beforeEach(function() {
        var spotifyApiStub = sinon.createStubInstance(spotifyApi)
        setupStub = sinon.stub(spotify.SpotifyModule.prototype, 'setupCredentials').callsFake(
            function fakeSetup() {}
        )
        var spotifyModule = new spotify.SpotifyModule(spotifyApiStub)
        var util = new messenger.MessengerUtilModule(spotifyModule)
        backend = new backendModule.BackendModule(util)
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