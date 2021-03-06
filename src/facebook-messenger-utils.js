'use strict'

var spotify = require('./spotify-module.js'),
    strings = require('../res/strings-en.json')

/**
 * Provides message builders, interaction with Spotify, user tracking
 * @name MessengerUtilModule
 * @param {*} spotifyModule
 */
class MessengerUtilModule {
    constructor(spotifyModule=new spotify.SpotifyModule()){
        this._spotifyModule = spotifyModule
        this._spotifyModule.setupCredentials()

        /**
         * Map of sender_id that the bot is waiting for a passphrase from
         * - KEY: sender 
         * - VAL: {songId, songName, artist, preview}
         * @var {Map} songRequests
         */
        this._songRequests = new Map()

        /**
         * Mapp of hosts and their associated passcodes and information
         * - KEY: passcode
         * - VAL: {fbId, spotifyId, playlistId, accessToken, refreshToken}
         * @var {Map} hostList
         */
        this._hostList = new Map()

        // TODO: replace with postgresSQL database tables
    }

    /**
     * Determines appropriate response message
     * @param {String} senderId 
     * @param {String} messageText
     * @return {Array} responseMessages
     */
    responseBuilder(
        senderId, 
        messageText,
        module=this
    ) {
        var keyword = messageText.toLowerCase()
        if (messageText.includes(" ")) {
            keyword = keyword.substring(0, keyword.indexOf(" "))
        }
        
        switch (keyword) {
            case "help":
                return strings.responseHelp
            case "about":
                return strings.responseAbout
            case "search":
                return module._searchResponse(messageText)
            case "host":
                return module._loginResponse(senderId)
            default:
                return strings.responseDefault
        }
    }

    /**
     * Determines appropriate response message
     * @param {String} senderId 
     * @param {Object} songRequest
     */
    addSongRequest(senderId, songRequest) {
        this._songRequests.set(senderId, songRequest)
    }

    /**
     * Checks if Facebook user has outstanding song request
     * @param {String} senderId
     * @param {String} messageText
     * @return {Array} responseMessages of {senderId, responseMessage}
     */
    handleOutstandingSongRequest(
        senderId, 
        messageText,
        senderMessagePairMaker=this._senderMessagePairMaker
    ) {
        let songRequest = this.getSongRequest(senderId)
        let responseMessages = []
        if (messageText.toLowerCase() === "cancel") {
            this._songRequests.delete(senderId)
            responseMessages.push(senderMessagePairMaker(
                senderId, strings.requestCancelled
            ))
            return responseMessages
        }

        let host = this._hostList.get(messageText)
        if (host) {
            songRequest.passcode = messageText
            songRequest.sender = senderId
            songRequest.type = "requestapprove"
            let buttonTemplate = { 
                attachment: { 
                    type: "template", 
                    payload: { 
                        template_type: "button", 
                        text: eval('`'+strings.songRequestNotif+'`'), 
                        buttons: [
                            { 
                                type: "postback", 
                                title: strings.buttonPreview, 
                                payload: '{"type": "preview","url": "' + songRequest.preview + '","name": "' + songRequest.songName + '","artist": "' + songRequest.artist + '"}' 
                            }, 
                            { 
                                type: "postback", 
                                title: strings.buttonApproveSong, 
                                payload: JSON.stringify(songRequest) 
                            }
                        ] 
                    } 
                } 
            }

            responseMessages.push(senderMessagePairMaker(
                host.fbId, buttonTemplate
            ))
            responseMessages.push(senderMessagePairMaker(
                senderId, strings.requestDeliverConfirm
            ))
            this._songRequests.delete(senderId)
        } else {
            responseMessages.push(senderMessagePairMaker(
                senderId, strings.invalidHostCodeMessage
            ))
        }
        return responseMessages
    }

    /**
     * Handles song request approval
     * @param {Object} approveSongRequestPayload 
     * @return {Promise} resolves to an array of messages
     */
    handleApproveSongRequest(
        approveSongRequestPayload, 
        spotifyModule=this._spotifyModule,
        senderMessagePairMaker=this._senderMessagePairMaker,
        hostList=this._hostList
    ) {
        let responseMessages = []
        let sender = approveSongRequestPayload.sender
        // TODO: what happens if host doesn't exist anymore?
        let host = hostList.get(approveSongRequestPayload.passcode) 
        // host is {fbId, spotifyId, playlistId, accessToken, refreshToken, sender}
        // load is {passcode, sender, songId, songName, artist, preview}

        return new Promise(function(resolve, reject) {
            spotifyModule.approveSongRequest(host, approveSongRequestPayload.songId)
                .then(function(response) {
                    console.log("Succesful song approval")
                    responseMessages.push(senderMessagePairMaker(
                        host.fbId,
                        eval('`'+strings.songRequestApproveConfirm+'`')
                    ))
                    responseMessages.push(senderMessagePairMaker(
                        sender,
                        eval('`'+strings.songRequestApproved+'`')
                    ))
                    resolve(responseMessages)
                }).catch(function(err) {
                    responseMessages.push(senderMessagePairMaker(
                        sender, strings.requestApproveError
                    ))
                    responseMessages.push(senderMessagePairMaker(
                        host.fbId, strings.requestApproveError
                    ))
                    resolve(responseMessages)
                })
        })
    }

    /**
     * Assembles response message for audio attachment
     * @param {String} link
     * @return {Object} messageData
     */
    audioAttachmentResponse(link) {
        let messageData = {
            "attachment": {
                "type": "audio",
                "payload": {
                    "url": link
                }
            }
        }
        return(messageData)
    }

    /**
     * Adds host and host data to hostList
     * @param {String} passcode
     * @param {Object} hostData
     */
    addHost(passcode, hostData) {
        this._hostList.set(passcode, hostData)
    }

    /**
     * Creates 
     * @param {String} authenticationCode
     * @param {String} facebookId
     */
    createHost(
        authenticationCode, 
        facebookId, 
        spotifyModule=this._spotifyModule
    ) {
        return new Promise(function(resolve,reject) {
            spotifyModule.createHost(authenticationCode, facebookId)
                .then(function(data) {
                    resolve(data)
                }, function(err) {
                    reject()
                }
            )
        })
    }

    /**
     * Checks if sender has an outstanding song request
     * @param {String} senderId
     * @return {Boolean} hasSongRequest
     */
    hasSongRequest(senderId) {
        if (this._songRequests.get(senderId)) {
            return true
        } else { 
            return false
        }
    }

    /**
     * Retrieves SongRequest by senderId
     * @param {String} senderId
     * @return {Boolean} hasSongRequest
     */
    getSongRequest(senderId) {
        return this._songRequests.get(senderId)
    }

    _loginResponse(senderId, spotifyModule=this._spotifyModule) {
        var scopes = [
            'user-read-private',
            'playlist-read-collaborative', 
            'playlist-modify-private', 
            'playlist-modify-public'
        ]

        var authoriseURL = spotifyModule.createAuthLink(scopes, senderId)
        // note on 'state = senderId': "useful for correlating requests and responses"
        // (https://developer.spotify.com/web-api/authorization-guide/)

        console.log("Login URL created: ", authoriseURL)

        let messageSeries = []
        let buttonTemplate = {
            "attachment":{
                "type":"template",
                "payload":{
                    "template_type":"button",
                    "text":strings.login,
                    "buttons":[
                        {
                            "type":"web_url",
                            "title":strings.buttonLogin,
                            "url":authoriseURL
                        }
                    ]
                }
            }
        }
        messageSeries.push(buttonTemplate)
        return messageSeries
    }

    _searchResponse(
        messageText, 
        spotifyModule=this._spotifyModule,
        assembleSearchResponse=this._assembleSearchResponse
    ) {
        var searchTerm = messageText.substring(6,200) // exclude word "search"

        let messageSeries = []

        if (searchTerm.length<2) {
            messageSeries = [strings.noSearchTerm]
            return messageSeries
        }

        spotifyModule.search(searchTerm)
            .then(function(searchData) {
                let result = assembleSearchResponse(searchData)
                for (var i = 0; i < result.length; i++)
                    messageSeries.push(result[i])
            }).catch(function(err) {
                console.log("Error: " + err)
            })
        
        return messageSeries
    }

    _assembleSearchResponse(searchResultData) {
        let messageSeries = []

        var songTracks = searchResultData.body.tracks.items
        if (songTracks.length == 0) {
            messageSeries.push(strings.noSearchResult)
            return messageSeries
        } else if (songTracks.length < 7) {
            var numOfResults = songTracks.length
        } else {
            var numOfResults = 7
        }

        // build JSON for template message according to messenger api
        let messageData = {}
        messageData.attachment = {}
        messageData.attachment.type = "template"
        messageData.attachment.payload = {}
        messageData.attachment.payload.template_type = "generic"
        messageData.attachment.payload.image_aspect_ratio = "square"
        messageData.attachment.payload.elements = []
        for (var i = 0; i < numOfResults; i++) {
            var item = songTracks[i]
            var element = {}
            element.title = item.name
            element.subtitle = item.artists[0].name + " - " + item.album.name
            element.image_url = item.album.images[0].url
                element.default_action = {
                "type": "web_url",
                "url": "https://open.spotify.com/track/" + item.id
            }
            var button_payload = 
                element.buttons = [{
                    "type": "postback",
                    "title": "Preview",
                    "payload": '{"type": "preview","url": "' + item.preview_url
                        + '","name": "' + item.name 
                        + '","artist": "' + item.artists[0].name + '"}'
                    }, {
                        "type": "postback",
                        "title": "Request",
                        "payload": '{"type": "request","id": "' + item.id
                            + '","name": "' + item.name 
                            + '","artist": "' + item.artists[0].name 
                                + '","url": "' + item.preview_url + '"}'
                    }]
            messageData.attachment.payload.elements.push(element)
        }

        messageSeries.push(strings.searchResultFound)
        messageSeries.push(messageData)
        return messageSeries	
    }

    _senderMessagePairMaker(senderId, messageContent) {
        return {
            senderId:senderId,
            messageContent:messageContent
        }
    }
}

module.exports = {MessengerUtilModule}
