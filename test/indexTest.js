"use strict";

const assert = require("assert");
var bot = require("../index.js");

describe("Facebook Messenger Bot", function() {
  describe("test responseBuilder()", function() {
    var responseDefault = [
        "Hello! I am a Spotify chatbot.",
        "Type 'Search' followed by the name of a song you would like to find! For example, you could send me 'search modest mouse' to find songs from the best band ever.",
        "Type 'About' to learn more about me."
    ]
    var date = new Date()
    var expiry = new Date()
    expiry.setSeconds(expiry.getSeconds() + 3600)

    var responseAbout = [
        "I am a personal project of Robert Lin.",
        "I am a Facebook Messenger bot that interacts with Spotify to provide various services. I am a work in progress and will be receiving ongoing upgrades to my abilities.",
        "If I had a more inspired name than 'Spotify-chatbot project', I would be named Bob.",
        "I was last updated on: " + date,
        "My current Spotify client access token expires on: " + expiry
    ]
    var messageData = {}
    messageData.attachment = {}
	messageData.attachment.type = "template"
    messageData.attachment.payload = {}
    messageData.attachment.payload.template_type = "generic"
    messageData.attachment.payload.image_aspect_ratio = "square"
    messageData.attachment.payload.elements = []

    it("for introResponse() : empty term", function() {
        assert.deepEqual(bot.responseBuilder(""), responseDefault)
    });

    it("for introResponse() : keyword not first word", function() {
        assert.deepEqual(bot.responseBuilder("chicken about"), responseDefault)
        assert.deepEqual(bot.responseBuilder("chicken search"), responseDefault)
    });

    it('for aboutResponse() : "about" is first word of term', function() {
        assert.deepEqual(bot.responseBuilder("about"), responseAbout)
        assert.deepEqual(bot.responseBuilder("about me you"), responseAbout)
    });

    it('for searchResponse() : "search" is first word of term, no result', function() {
        /*
        let searchResult = ["I couldn't find anything, sorry :("]
        assert.deepEqual(bot.responseBuilder("search asdkfjalweijfag"), searchResult)
        */
    });

    it('for searchResponse() : "search" is first word of term, 1 to 6 results', function() {

        //TODO

        /*
        let searchResult = ["Here's what I found:"]
        searchResult.push(messageData)

        assert.deepEqual(bot.responseBuilder("search untitled 07 | levitate"), searchResult)
        //there should be 2 results
        */
    });

    it('for searchResponse() : "search" is first word of term, 7 results', function() {

        //TODO

        /*
        let searchResult = ["Here's what I found:"]
        searchResult.push(messageData)

        assert.deepEqual(bot.responseBuilder("search coldplay"), searchResult)
        */
    });

    it('login', function() {
        
        //TODO

    })
  });
});
