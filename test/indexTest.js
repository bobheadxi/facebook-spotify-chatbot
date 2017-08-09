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

    describe("test responseBuilder() cases with Spotify interactions", function(done) {
        var sendStub
        var searchStub

        beforeEach(function(){
            sendStub = bot.__set__('send', sinon.stub())
            searchStub = bot.__set__('searchResponse', sinon.stub(bot, 'searchResponse').callsFake(function(t) {
                return "valid"
            }))
        })
        afterEach(function(){
            sendStub()
            searchStub()
            bot.searchResponse.restore()
        })

        it('test the searchStub', function() {
            assert.equal("valid", bot.searchResponse("text"))
        })

        it('when "search" is first term, second term is specific song, should be fewer than 6 results', function(done) {
            //TODO
            /*
            let searchResult = ["Here's what I found:"]
            searchResult.push(messageData)
            assert.deepEqual(bot.responseBuilder("search untitled 07 | levitate"), searchResult)
            //there should be 2 results
            */
            done()
        })

        it('when "Search" is first term, second term is specific song, should more than 6 results', function(done) {
            //TODO
            /*
            let searchResult = ["Here's what I found:"]
            searchResult.push(messageData)
            assert.deepEqual(bot.responseBuilder("search coldplay"), searchResult)
            */
            done()
        })

        it('when "Search" is the first term, but nothing after, should return fail', function(done) {
            //TODO
            /*
            let searchResult = ["I couldn't find anything, sorry :("]
            assert.deepEqual(bot.responseBuilder("search asdkfjalweijfag"), searchResult)
            */
            done()
        })
    })

    describe("test basic responseBuilder() cases", function(done) {
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
            var sendSpy = sinon.stub(bot, 'send')
        })

        afterEach(function() {
            bot.send.restore()
        })

        it("empty string should return default message", function(done) {
            assert.deepEqual(bot.responseBuilder(sender, ""), responseDefault)
            done()
        })

        it("when keyword is not the first term. should return default message", function(done) {
            assert.deepEqual(bot.responseBuilder(sender, "chicken about"), responseDefault)
            assert.deepEqual(bot.responseBuilder(sender, "chicken search"), responseDefault)
            done()
        })

        it('when "About" is the first term, should return about message', function(done) {
            assert.deepEqual(bot.responseBuilder(sender, "about"), responseAbout)
            assert.deepEqual(bot.responseBuilder(sender, "about me you"), responseAbout)
            done()
        })



    })



})
