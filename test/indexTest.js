"use strict"

const assert = require('assert')
const expect = require('chai').expect;
const sinon = require('sinon')
const bot = require("../index.js")


var herokuServerUri = process.env.HEROKU_URI

describe("Facebook Messenger Bot", function() {
    
    beforeEach(function() {
        
    })
    afterEach(function() {
        
    })


    describe("test Facebook interactions", function(){
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

        beforeEach(function() {
            var sendSpy = sinon.spy(bot, 'send')
        })
        afterEach(function() {
            bot.send.restore()
        })

        it('when postback is of type "preview", send preview if preview available', function() {
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
            assert("Here's a preview of song by artist:", bot.send.getCall(0))
            assert(messageData, bot.send.getCall(1))
        }) 

        it('when postback is of type "preview", send error if preview not available', function() {
            var payload = { 
                    "type": "preview",
                    "url": "www.spotify.com/no-preview",
                    "name": "song",
                    "artist": "artist"}
            var event = {
                "sender":{"id":"1234"}, 
                "postback": {"payload": JSON.stringify(payload)}
            }
            bot.handlePostback(event)
            assert("Sorry, no preview is available for this song. You can tap the album art to open the song in Spotify.", bot.send.getCall(0))
        })
/*
        it('when postback is of type "request", reject if sender has outstanding passcode request', function(){
            var payload = { 
                    "type": "request",
                    "url": "www.spotify.com/no-preview",
                    "name": "song",
                    "artist": "artist"}
            var event = {
                "sender":{"id":"1234"}, 
                "postback": {"payload": JSON.stringify(payload)}
            }
        })
*/
    })

    describe("test responseBuilder() cases with Spotify interactions", function(done) {

        it('when "search" is first term, second term is specific song, should be fewer than 6 results', function() {
            //TODO
            /*
            let searchResult = ["Here's what I found:"]
            searchResult.push(messageData)
            assert.deepEqual(bot.responseBuilder("search untitled 07 | levitate"), searchResult)
            //there should be 2 results
            */
        })

        it('when "Search" is first term, second term is specific song, should more than 6 results', function() {
            //TODO
            /*
            let searchResult = ["Here's what I found:"]
            searchResult.push(messageData)
            assert.deepEqual(bot.responseBuilder("search coldplay"), searchResult)
            */
        })

        it('when "Search" is the first term, but nothing after, should return fail', function() {
            //TODO
            /*
            let searchResult = ["I couldn't find anything, sorry :("]
            assert.deepEqual(bot.responseBuilder("search asdkfjalweijfag"), searchResult)
            */
        })
    })

    describe("test basic responseBuilder() cases", function() {
        var responseDefault = [
            "I am not sure how to respond to that. Type 'Help' to get tips!"
        ]
        var responseHelp = [
            "Hello! I am a Spotify chatbot.",
            "Type 'Search' followed by the name of a song you would like to find! For example, you could send me 'search modest mouse' to find songs from the best band ever.",
            "Type 'About' to learn more about me."
        ]
        var date = new Date()
        var responseAbout = [
            "I am a personal project of Robert Lin.",
            "I am a Facebook Messenger bot that interacts with Spotify to provide various services. I am a work in progress and will be receiving ongoing upgrades to my abilities.",
            "If I had a more inspired name than 'Spotify-chatbot project', I would be named Bob.",
            "For release notes go to https://github.com/bobheadxi/facebook-spotify-chatbot/releases"
        ]
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

        it("empty string should return default message", function() {
            assert.deepEqual(bot.responseBuilder(sender, ""), responseDefault)
        })

        it("when keyword is not the first term. should return default message", function() {
            assert.deepEqual(bot.responseBuilder(sender, "chicken about"), responseDefault)
            assert.deepEqual(bot.responseBuilder(sender, "chicken search"), responseDefault)
        })

        it('when "About" is the first term, should return about message', function() {
            assert.deepEqual(bot.responseBuilder(sender, "about"), responseAbout)
            assert.deepEqual(bot.responseBuilder(sender, "about me you"), responseAbout)
        })



    })



})
