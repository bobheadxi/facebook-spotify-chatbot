"use strict"

const assert = require('assert')
const expect = require('chai').expect;
const sinon = require('sinon')
const rewire = require('rewire')
const bot = rewire("../index.js")

var herokuServerUri = process.env.HEROKU_URI
var strings = require('../res/strings-en.json')

describe("Facebook Messenger Bot", function() {
    
    before(function() {
        
    })
    after(function() {

    })


    describe("test Facebook interactions", function(done){
        /*
        it("Should set get started", function(done) {
            //TODO
        })
        it("Retrieve message received from a user", function(done) {
            //TODO
        })
        */
    

    })

    describe("test Facebook postback handling", function(done) {
        var sender = "1234"
        var sendStub
        var approveStub
        var sendMessagesStub

        beforeEach(function() {
            sendStub = bot.__set__('send', sinon.stub())
            approveStub = bot.__set__('approveSongRequest', sinon.stub())
            sendMessagesStub = bot.__set__('sendMessages', sinon.stub())
        })

        afterEach(function() {
            sendStub()
            approveStub()
            sendMessagesStub()
        })

        it('when postback is of type "preview", send preview if preview available', function(done) {
            var payload = { 
                    "type": "preview",
                    "url": "www.spotify.com/mp3-preview",
                    "name": "song",
                    "artist": "artist"}
            var event = {
                "sender":{"id":"1234"}, 
                "postback": {"payload": JSON.stringify(payload)}
            }
            bot.handlePostback(event)
            let messageData = {
    	        "attachment": {
      		        "type": "audio",
      		        "payload": {
        		        "url": "www.spotify.com/mp3-preview"
      		        }
      	        }
	        }
            assert("Here's a preview of song by artist:", 
                    bot.__get__('send').getCall(0))
            assert(messageData,
                    bot.__get__('send').getCall(0))
            done()
        }) 

        it('when postback is of type "preview", send error if preview not available', function(done) {
            var payload = { 
                "type": "preview",
                "url": "www.spotify.com/no-preview",
                "name": "song",
                "artist": "artist"
            }
            var event = {
                "sender":{"id":"1234"}, 
                "postback": {"payload": JSON.stringify(payload)}
            }
            bot.handlePostback(event)
            assert(strings.noPreviewAvailableMessage, 
                    bot.__get__('send').getCall(0))
            done()
        })

        it('when postback is of type "request", reject if sender has outstanding passcode request', function(done) {
            bot.songRequests.set(
                sender,
                {}
            )
            var payload = { 
                "type": "request",
                "id": "1234",
                "name": "song",
                "artist": "artist",
                "url": "www.spotify.com/mp3-preview"
            }
            var event = {
                "sender":{"id":"1234"}, 
                "postback": {"payload": JSON.stringify(payload)}
            }
            bot.handlePostback(event)
            assert(strings.noHostCodeSentMessage,
                    bot.__get__('send').getCall(0))
            done()
        })

        it('when postback is of type "request", requets for passcode from user', function(done) {
            var payload = { 
                "type": "request",
                "id": "1234",
                "name": "song",
                "artist": "artist",
                "url": "www.spotify.com/mp3-preview"
            }
            var event = {
                "sender":{"id":"1234"}, 
                "postback": {"payload": JSON.stringify(payload)}
            }
            bot.handlePostback(event)
            assert(strings.hostCodeRequestMessage,
                    bot.__get__('send').getCall(0))
            assert(bot.songRequests.has("1234"))
            done()
        })

        it('when postback is of type "requestapprove", call approveSongRequest', function(done) {
            var payload = { 
                "type": "requestapprove",
                "id": "1234",
                "name": "song",
                "artist": "artist",
                "url": "www.spotify.com/mp3-preview",
                "passcode": "789",
                "sender": "2234"
            }
            var event = {
                "sender":{"id":"1234"}, 
                "postback": {"payload": JSON.stringify(payload)}
            }
            bot.handlePostback(event)

            assert(bot.__get__('approveSongRequest').called)
            done()
        })

        it('when postback is of type "getstarted", send intro dialogue', function(done) {
            var payload = { 
                "type": "getstarted"
            }
            var event = {
                "sender":{"id":"1234"}, 
                "postback": {"payload": JSON.stringify(payload)}
            }
            bot.handlePostback(event)

            assert.equal(false, bot.__get__('sendMessages').called)
            setTimeout(function() {assert(bot.__get__('sendMessages').called)}, 400)
            done()
        })

        it('when unknown postback received, reply with error message', function(done) {
            var payload = { 
                "type": "somebrokentype"
            }
            var event = {
                "sender":{"id":"1234"}, 
                "postback": {"payload": JSON.stringify(payload)}
            }
            bot.handlePostback(event)

            assert(strings.responseUnknown,
                    bot.__get__('send').getCall(0))
            done()
        })
    })

    describe("test Spotify search helpers", function(done) {

        it('when searchResponse() is called without a search term, should return error message', function(done) {
            assert.deepEqual([strings.noSearchTerm], bot.searchResponse("search"))
            done()
        })

        // TODO
        /*
        it('when searchResponse() is called with a search term, conduct search with term', function(done) {
            var searchStub = bot.__set__('search', sinon.stub(bot, 'search').callsFake(function(t) {
                return new Promise(function(resolve, reject) {
                    resolve(["Result1", "Result2"])
                })
            }))

            var response = bot.searchResponse("search some song")
            
            setTimeout(function() {
                assert.deepEqual(["Result1", "Result2"], response)
                assert(bot.__get__('search').calledWith("some song"))
            }, 200)
            
            searchStub()
        })
        */
    })

    describe("test basic responseBuilder() cases", function(done) {
        var sendStub
        var searchStub

        var responseDefault = strings.responseDefault;
        var responseHelp = strings.responseHelp;
        var responseAbout = strings.responseAbout
        var date = new Date()
        var messageData = {
            attachment:{
                type:"template",
                payload:{
                    template_type:"generic",
                    image_aspect_ratio:"square",
                    elements:[]
                }
            }
        }
        var sender = "1234"

        beforeEach(function() {
            sendStub = bot.__set__('send', sinon.stub())
            searchStub = bot.__set__('searchResponse', sinon.stub())
        })

        afterEach(function() {
            sendStub()
            searchStub()
        })

        it("empty string should return default message", function(done) {
            assert.deepEqual(bot.responseBuilder(sender, ""), responseDefault)
            done()
        })

        it("when keyword is not the first term. should return default message", function(done) {
            assert.deepEqual(responseDefault, bot.responseBuilder(sender, "chicken about"))
            assert.deepEqual(responseDefault, bot.responseBuilder(sender, "chicken search"))
            done()
        })

        it('when "About" is the first term, should return about message', function(done) {
            assert.deepEqual(responseAbout, bot.responseBuilder(sender, "about"))
            assert.deepEqual(responseAbout, bot.responseBuilder(sender, "about me you"))
            done()
        })

        it('when "Search" is first term, should call searchResponse using whole term', function(done) {
            bot.responseBuilder(sender, "search some song")

            assert.equal(true, bot.__get__('searchResponse').called)
            assert(bot.__get__('searchResponse').calledWith("search some song"))
            done()
        })

    })

})
