"use strict"

var assert = require('assert'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    strings = require('../res/strings-en.json')

var MessengerUtilModule = require('../src/facebook-messenger-utils.js'),
    SpotifyModule = require('../src/spotify-module.js'),
    SpotifyWebApi = require("spotify-web-api-node")

describe("Facebook Messenger Util module", function() {
    var sender = "1234", 
        util

    var spotifyApiStub,
        setupStub

    beforeEach(function() {
        spotifyApiStub = sinon.createStubInstance(SpotifyWebApi)
        setupStub = sinon.stub(SpotifyModule.prototype, 'setupCredentials').callsFake(
            function fakeSetup() {}
        )
        var spotifyModule = new SpotifyModule(spotifyApiStub)
        util = new MessengerUtilModule(spotifyModule)
    })

    afterEach(function() {
        setupStub.restore();
    })

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
                        return "http://www.google.com/"
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
        var senderId = "1234",
            songRequest = {
                songId: "9876",
                songName: "Float On",
                artist: "Modest Mouse",
                preview: "www.google.com"
            },
            host = {
                fbId: "0899", 
                spotifyId: "696969", 
                playlistId: "6969", 
                accessToken: "abcde1234", 
                refreshToken: "abcde5678"
            }

        it('when user is cancelling their song request', function() {
            util.addSongRequest(senderId, songRequest)

            var response = util.handleOutstandingSongRequest(
                senderId,
                "cancel"
            )

            assert.equal(1, response.length)
            assert.equal(strings.requestCancelled, response[0].messageContent)
            assert.equal(senderId, response[0].senderId)
            assert.equal(false, util.hasSongRequest(senderId))
        })

        it('when user enters correct host code', function() {
            util.addSongRequest(senderId, songRequest)
            util.addHost("6969", host)

            var response = util.handleOutstandingSongRequest(
                senderId,
                "6969"
            )

            assert.equal(2, response.length)
            assert.equal(senderId, response[1].senderId)
            assert.equal(strings.requestDeliverConfirm, response[1].messageContent)
            
            var hostResponseAttachment = response[0].messageContent.attachment
            assert.equal("0899", response[0].senderId)
            assert.equal("button", hostResponseAttachment.payload.template_type)
            assert.equal(
                "A user has requested the song Float On by Modest Mouse",
                hostResponseAttachment.payload.text
            )
            assert.deepEqual(
                {type:"preview",url:"www.google.com",name:"Float On",artist:"Modest Mouse"},
                JSON.parse(hostResponseAttachment.payload.buttons[0].payload)
            )
            
            var secondButtonPayload = JSON.parse(hostResponseAttachment.payload.buttons[1].payload)
            assert.equal("6969", secondButtonPayload.passcode)
            assert.equal(senderId, secondButtonPayload.sender)
            assert.equal("requestapprove", secondButtonPayload.type)

            assert.equal(false, util.hasSongRequest(senderId))
        })

        it('when user enters invalid host code', function() {
            util.addSongRequest(senderId, songRequest)
            util.addHost("6969", host)

            var response = util.handleOutstandingSongRequest(
                senderId,
                "i dunno"
            )

            assert.equal(1, response.length)
            assert.equal(senderId, response[0].senderId)
            assert.equal(strings.invalidHostCodeMessage, response[0].messageContent)
            assert.equal(true, util.hasSongRequest(senderId))
        })
    })

    describe("handleApproveSongRequest(...)", function(done) {
        var host = {
            fbId: "0899", 
            spotifyId: "696969", 
            playlistId: "6969", 
            accessToken: "abcde1234", 
            refreshToken: "abcde5678"
        }
        var request = {
            sender: "1234", 
            passcode: "0899",
            songId: "abcde123",
            songName: "Float On"
        }

        it('when song request is approved, notify users and call SpotifyModule.approveSongRequest', function(done) {
            var approveStub = sinon.stub(SpotifyModule.prototype, 'approveSongRequest').callsFake(
                function fakeApprove(h, id) {
                    return new Promise(function(resolve, reject) {
                        resolve()
                    })
                }
            )
            util.addHost("0899", host)

            util.handleApproveSongRequest(request)
            .then(function(responses) {
                assert.equal(2, responses.length)
                assert.equal(host.fbId, responses[0].senderId)
                assert.equal(request.sender, responses[1].senderId)
                done()
            })
            approveStub.restore()
        })

        it('when song request approval errors out, notify users', function(done) {
            var approveStub = sinon.stub(SpotifyModule.prototype, 'approveSongRequest').callsFake(
                function fakeApprove(h, id) {
                    return new Promise(function(resolve, reject) {
                        reject("Bad thing happened")
                    })
                }
            )
            util.addHost("0899", host)
            var responses = util.handleApproveSongRequest(request)

            util.handleApproveSongRequest(request)
            .then(function(responses) {
                assert.equal(2, responses.length)
                assert.equal(host.fbId, responses[1].senderId)
                assert.equal(request.sender, responses[0].senderId)
                assert.equal(strings.requestApproveError, responses[0].messageContent)
                done()
            })
            approveStub.restore()
        })
    })

    describe("createHost(...)", function() {
        it('Host creation calls SpotifyModule', function(done) {
            var createHostStub = sinon.stub(SpotifyModule.prototype, 'createHost').callsFake(
                function fakeCreate(a, id) {
                    return new Promise(function(resolve, reject) {
                        resolve({
                            // some host data
                         })
                    })
                }
            )
            util.createHost("123", "123")
            assert(createHostStub.called)
            done()
        })
    })

    describe("audioAttachmentResponse(...)", function() {
        it('places link in appropriate JSON format', function() {
            var link = "www.google.com"
            var response = util.audioAttachmentResponse(link)
            assert.equal("audio", response.attachment.type)
            assert.equal(link, response.attachment.payload.url)
        })
    })
})