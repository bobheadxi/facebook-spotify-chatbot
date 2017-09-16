"use strict"

var assert = require('assert'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    strings = require('../res/strings-en.json')

var MessengerUtilModule = require('../src/facebook-messenger-utils.js'),
    SpotifyModule = require('../src/spotify-module.js')

describe("Facebook Messenger Util module", function() {
    var sender = "1234", 
        util = new MessengerUtilModule()

    describe("responseBuilder()", function(done) {
        var responseDefault = strings.responseDefault, 
            responseHelp = strings.responseHelp,
            responseAbout = strings.responseAbout,
            searchData3Songs = require('./sample_data/search-data-3-songs'),
            searchData10Songs = require('./sample_data/search-data-10-songs')

        it('when no match, should return "default" message', function() {
            assert.deepEqual(responseDefault, util.responseBuilder(sender, ""))
            assert.deepEqual(responseDefault, util.responseBuilder(sender, "chicken about"))
            assert.deepEqual(responseDefault, util.responseBuilder(sender, "chicken search"))
        })

        it('when "Help" is 1st term, should return "help" message', function() {
            assert.deepEqual(responseHelp, util.responseBuilder(sender, "help"))
            assert.deepEqual(responseHelp, util.responseBuilder(sender, "help me I suck"))
        })
        
        it('when "About" is 1st term, should return "about" message', function() {
            assert.deepEqual(responseAbout, util.responseBuilder(sender, "about"))
            assert.deepEqual(responseAbout, util.responseBuilder(sender, "about me you"))
        })

        describe("when 'Search' is 1st term", function(done) {
            it('when phrase is 2nd, should songs as messages in correct format', function(done) {
                var searchStub = sinon.stub(SpotifyModule.prototype, 'search').callsFake(
                    function fakeSearch(t) {
                        return new Promise(function(resolve, reject) {
                            resolve(searchData3Songs)
                        })
                    }
                )
    
                var searchResponse = util.responseBuilder(sender, "search muse")
                setTimeout(function() {
                    assert.equal(2, searchResponse.length)
                    var messageAttachment = searchResponse[1]
                    assert(messageAttachment)
                    assert.equal("template", messageAttachment.attachment.type)
    
                    var payload = messageAttachment.attachment.payload
                    assert.equal("generic", payload.template_type)
                    assert.equal("square", payload.image_aspect_ratio)
                    assert.equal(3, payload.elements.length)
                    
                    var expectedAttachmentExample = { 
                        title: 'Uprising',
                        subtitle: 'Muse - The Resistance',
                        image_url: 'https://i.scdn.co/image/6e1be3ceda70250c701caee5a16bef205e94bc98',
                        default_action: { 
                            type: 'web_url',
                            url: 'https://open.spotify.com/track/4VqPOruhp5EdPBeR92t6lQ' 
                        },
                        buttons: [ 
                            { type: 'postback',
                                title: 'Preview',
                                payload: '{"type": "preview","url": "https://p.scdn.co/mp3-preview/104ad0ea32356b9f3b2e95a8610f504c90b0026b?cid=8897482848704f2a8f8d7c79726a70d4","name": "Uprising","artist": "Muse"}' },
                            { type: 'postback',
                                title: 'Request',
                                payload: '{"type": "request","id": "4VqPOruhp5EdPBeR92t6lQ","name": "Uprising","artist": "Muse","url": "https://p.scdn.co/mp3-preview/104ad0ea32356b9f3b2e95a8610f504c90b0026b?cid=8897482848704f2a8f8d7c79726a70d4"}' 
                            } 
                        ] 
                    }
                    assert.deepEqual(expectedAttachmentExample, payload.elements[0])
    
                    searchStub.restore()
                    done()
                }, 300)
            })
    
            it('when phrase is 2nd, should not send more than 7 songs', function(done) {
                var searchStub = sinon.stub(SpotifyModule.prototype, 'search').callsFake(
                    function fakeSearch(t) {
                        return new Promise(function(resolve, reject) {
                            resolve(searchData10Songs)
                        })
                    }
                )
    
                var searchResponse = util.responseBuilder(sender, "search muse")
                setTimeout(function() {
                    assert.equal(2, searchResponse.length)
                    var messageAttachment = searchResponse[1]
                    assert.equal(7, messageAttachment.attachment.payload.elements.length)
    
                    searchStub.restore()
                    done()
                }, 300)
            })
    
            it('when phrase is 2nd and no songs found, should return message', function(done) {
                var searchStub = sinon.stub(SpotifyModule.prototype, 'search').callsFake(
                    function fakeSearch(t) {
                        return new Promise(function(resolve, reject) {
                            var noSongsResult = {}
                            noSongsResult.body = {}
                            noSongsResult.body.tracks = {}
                            noSongsResult.body.tracks.items = []
                            resolve(noSongsResult)
                        })
                    }
                )
    
                var searchResponse = util.responseBuilder(sender, "search muse")
                setTimeout(function() {
                    assert.equal(1, searchResponse.length)
                    assert.deepEqual([strings.noSearchResult], searchResponse)
    
                    searchStub.restore()
                    done()
                }, 300)
            })
    
            it('when no phrase included, should return message', function() {
                assert.deepEqual([strings.noSearchTerm], util.responseBuilder(sender, "search"))
            })
        })

        describe("when 'Host' is first term", function(done) {
            it('create a login link', function(done){
                var authMakerStub = sinon.stub(SpotifyModule.prototype, 'createAuthLink').callsFake(
                    function fakeSearch(scopes, senderId) {
                        return new Promise(function(resolve, reject) {
                            resolve("http://www.google.com/")
                        })
                    }
                )

                var loginResponse = util.responseBuilder(sender, "host")
                setTimeout(function() {
                    assert.equal(1, loginResponse.length)
                    var responseAttachment = loginResponse[0].attachment
                    assert.equal(
                        "button", 
                        responseAttachment.payload.template_type
                    )
                    assert.equal(
                        "http://www.google.com/", 
                        responseAttachment.payload.buttons[0].url
                    )
                    authMakerStub.restore()
                    done()
                }, 300)
            })
        })
    })

    describe("handleOutstandingSongRequest(...)", function(done) {
        var senderId = 1234,
            songRequest = {
                songId: 9876,
                songName: "Float On",
                artist: "Modest Mouse",
                preview: "www.google.com"
            }

        it('when user is cancelling their song request', function() {
            util.addSongRequest(senderId, songRequest)

            var response = util.handleOutstandingSongRequest(
                songRequest,
                senderId,
                "cancel"
            )

            assert.equal(1, response.length)
            assert.equal(strings.requestCancelled, response[0].messageContent)
            assert.equal(senderId, response[0].senderId)
            assert.equal(false, util.hasSongRequest(senderId))
        })

        it('when ')
    })

})