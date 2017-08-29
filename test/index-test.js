"use strict"

var assert = require('assert'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    rewire = require('rewire'),
    strings = require('../res/strings-en.json')

var bot = rewire("../index.js")

var herokuServerUri = process.env.HEROKU_URI

describe("index.js tests", function() {
    const fbMessageApiUrl = "https://graph.facebook.com/v2.6/me/messages"
    const fbToken = 987654321

    before(function() {
        
    })
    after(function() {

    })

    /*
    describe("test Request interactions", function(done) {
        var sender = "1234"
        var postStub

        beforeEach(function() {
            postStub = sinon.stub(request, 'post')
        })

        afterEach(function() {
            bot.request.post.restore();
        })

        it ('should send message to sender in request body', function() {
            var request = {
                url: fbMessageApiUrl,
                qs: {access_token:fbToken},
                method: 'POST',
                json: {
                    recipient: {id:sender},
                    message: "Some Message",
                }
            }
            var expected = JSON.stringify(request)
            bot.sendSingleMessage(sender, "Some Message")
            assert(postStub.withArgs(expected).calledOnce)
        })

    }) 
    */

    /*
    describe("test Facebook postback handling", function(done) {
        var sender = "1234"
        var sendStub
        var approveStub
        var sendMessagesStub

        beforeEach(function() {
            singleSendStub = bot.__set__('send', sinon.stub())
            multiSendStub = bot.__set__('sendMultipleMessages', sinon.stub())
        })

        afterEach(function() {
            singleSendStub()
            multiSendStub()
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
    */

})
