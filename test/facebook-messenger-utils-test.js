"use strict"

const assert = require('assert')
const expect = require('chai').expect;
const sinon = require('sinon')
const rewire = require('rewire')
const util = rewire("../src/facebook-messenger-utils.js")

var strings = require('../res/strings-en.json')

describe("Facebook Messenger Util Methods", function() {
    describe("test Spotify search helpers", function(done) {

        
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

        it("empty string should return default message", function(done) {
            assert.deepEqual(responseDefault, util.responseBuilder(sender, ""))
            done()
        })

        it("when keyword is not the first term. should return default message", function(done) {
            assert.deepEqual(responseDefault, util.responseBuilder(sender, "chicken about"))
            assert.deepEqual(responseDefault, util.responseBuilder(sender, "chicken search"))
            done()
        })

        it('when "About" is the first term, should return about message', function(done) {
            assert.deepEqual(responseAbout, util.responseBuilder(sender, "about"))
            assert.deepEqual(responseAbout, util.responseBuilder(sender, "about me you"))
            done()
        })

        it('when "Search" is first term, should call searchResponse using whole term', function(done) {
            // TODO: update for restructured methods
            /*
            var searchStub = util.__set__('searchResponse', sinon.stub())
            util.responseBuilder(sender, "search some song")

            assert.equal(true, util.__get__('searchResponse').called)
            assert(util.__get__('searchResponse').calledWith(sender, "search some song"))
            
            searchStub()
            done()
            */
        })

        it('when "Search" is first term, but has no search term, should return error message', function(done) {
            assert.deepEqual([strings.noSearchTerm], util.responseBuilder(sender, "search"))
            done()
        })

    })



})