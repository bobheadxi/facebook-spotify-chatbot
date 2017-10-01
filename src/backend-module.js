var strings = require('../res/strings-en.json'),
    request = require('request'),
    MessengerUtilModule = require('./facebook-messenger-utils.js')

const fbToken = process.env.FB_TOKEN,
    fbMessageApiUrl = "https://graph.facebook.com/v2.6/me/messages"

function BackendModule(
    messengerUtilModule = new MessengerUtilModule
) {
    this._util = messengerUtilModule
}

BackendModule.prototype = {
    /**
     * Handles messaging events passed from Facebook
     * @param {List} messagingEvents
     */
    handleMessagingEvents: function(messageEvents) {
        // get all events
        for (let i = 0; i < messageEvents.length; i++) {
            let event = messageEvents[i]
            
            if (event.message && event.message.text) {
                this._handleMessage(event)
            }
            
            if (event.postback) {
                this._handlePostback(event)
            }
        }
    },

    /**
     * Sets up and manages Host creation
     * @param {String} authenticationCode
     * @param {String} facebookId
     */
    handleCreateHost: function(authenticationCode, facebookId, module=this) {
        // TODO: better code generation
        let passcode = facebookId.substring(4,8)
        
        this._util.createHost(authenticationCode, facebookId)
        .then(function(hostData) {
            module._sendSingleMessage(
                facebookId, 
                eval('`'+strings.authenticationComplete+'`')
            )
            this._util.addHost(String(passcode), hostData)
            
        }, function(err) {
            module._sendSingleMessage(facebookId, strings.spotifyConnectError)
        })
    },

    /**
     * Prompts Facebook to activate a Get Started page
     */
    setGetStarted: function() {
        request({
            url: 'https://graph.facebook.com/v2.6/me/messenger_profile',
            qs: {access_token:fbToken},
            method: 'POST',
            json: {
                get_started:{
                    payload:'{"type": "getstarted"}'
                }
            }
        }, function(error, response, body) {
            if (error) {
                console.error("Error at method setGetStarted(): ", error)
            } else if (response.body.error) {
                console.error("Error at method setGetStarted(): ", response.body.error)
            } else {
                console.log("Setting 'Get Started': ", response.body.result)
            }
        })
    },

    _handleMessage: function(event, module=this) {
        if (event.message.is_echo === true) {
            return
        }
    
        let messageText = event.message.text,
            senderId = event.sender.id
        console.log("Message received: '" + messageText + "' from " + senderId)
        
        module._typingIndicator(senderId, false)
    
        if (module._util.hasSongRequest(senderId)) {
            let songRequest = module._util.getSongRequest(senderId)
            let responseMessages = module._util.handleOutstandingSongRequest(songRequest, senderId, messageText)
            for (let message of responseMessages) {
                console.error(message.senderId + " " + message.messageContent)
                module._sendSingleMessage(message.senderId, message.messageContent)
            }
            return
        }
    
        let messageDataSeries = module._util.responseBuilder(senderId, messageText)
        setTimeout(function() {
            module._sendMultipleMessages(senderId, messageDataSeries, 0)
        }, 300)
    },

    _handlePostback: function(event, module=this) {
        let load = JSON.parse(event.postback.payload),
            senderId = event.sender.id
        console.info("Postback received of type: " + JSON.stringify(load.type) + " from " + senderId)
        
        switch (load.type) {
            case "preview":
                if (load.url.includes("mp3-preview")) {
                    module._sendSingleMessage(senderId, eval('`'+strings.previewDescription+'`'))
                    module._sendSingleMessage(senderId, this._util.audioAttachmentResponse(load.url))
                } else {
                    module._sendSingleMessage(senderId, strings.noPreviewAvailableMessage)
                }
                break

            case "request":
                //TODO: save in database instead
                if (this._util.hasSongRequest(senderId)) {
                    module._sendSingleMessage(senderId, strings.noHostCodeSentMessage)
                    break
                }
                
                this._util.addSongRequest(senderId, 
                    {
                        songId: load.id,
                        songName: load.name,
                        artist: load.artist,
                        preview: load.url
                    })
                module._sendSingleMessage(senderId, strings.hostCodeRequestMessage)
                break

            case "requestapprove":
                util.handleApproveSongRequest(load)
                    .then(function(responseMessages) {
                        for (let message of responseMessages) {
                            module._sendSingleMessage(message.senderId, message.messageContent)
                        }
                    })
                break

            case "getstarted":
                setTimeout(function() {
                    module._sendMultipleMessages(senderId, introResponse(), 0)
                }, 300)
                break

            default:
                console.error("Postback for undefined received from " + senderId)
                module._sendSingleMessage(senderId, strings.responseUnknown)
                break	
        }
    },

    _sendMultipleMessages: function(senderId, messages, position, module=this) {
        console.log("Sending series: " + messages)
        if (position < messages.length) {
            module._typingIndicator(senderId, true)
            let data = messages[position]
    
            if ((typeof data) == "string") {
                data = {text:data}
            }
    
            setTimeout(function(){
                request({
                    url: fbMessageApiUrl,
                    qs: {access_token:fbToken},
                    method: 'POST',
                    json: {
                        recipient: {id:senderId},
                        message: data,
                    }
                }, function(error, response, body) {
                    if (error) {
                        console.error("Error at method sendSeries(): ", error)
                    } else if (response.body.error) {
                        console.error("Error at method sendSeries(): ", response.body.error)
                    } else {
                        //console.log("Message delivered: ", data)
                    }
                    module._sendMultipleMessages(senderId, messages, position+1)
                })
            },300)
        } else {
            return
        }
    },

    _sendSingleMessage: function(senderId, message) {
        if ((typeof message) == "string") {
            message = {text:message}
        }
    
        request({
            url: fbMessageApiUrl,
            qs: {access_token:fbToken},
            method: 'POST',
            json: {
                recipient: {id:senderId},
                message: message,
            }
        }, function(error, response, body) {
            if (error) {
                console.error("Error at method send(): ", error)
            } else if (response.body.error) {
                console.error("Error at method send(): ", response.body.error)		
            } else {
                console.log("Message delivered: ", message)
            }
        })
    },

    _typingIndicator: function(senderId, status) {
        var state
        if (status) state = "on"
        else state = "off"

        request({
            url: fbMessageApiUrl,
            qs: {access_token:fbToken},
            method: 'POST',
            json: {
                recipient: {id:senderId},
                sender_action: 'typing_' + state,
            }
        }, function(error, response, body) {
            if (error) {
                console.error("Error at method typingIndicator(): ", error)
                console.error("For sender id: ", senderId)
            } else if (response.body.error) {
                console.error("Error at method typingIndicator(): ", response.body.error)
                console.error("For sender id: ", senderId)
            }
        })
    }
}

module.exports = BackendModule