'use strict'

var express = require('express'),
	bodyParser = require('body-parser'),
	request = require('request'),
	app = express(),
	strings = require('./res/strings-en.json'),
	MessengerUtilModule = require('./src/facebook-messenger-utils.js')

const fbToken = process.env.FB_TOKEN,
	  fbMessageApiUrl = "https://graph.facebook.com/v2.6/me/messages"

var last_updated = new Date(),
    util = new MessengerUtilModule()

// Setup and start server
app.set("port", (process.env.PORT || 3000))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.get("/", function (req, res) {
	res.send("This is Robert's bot server")
})
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'cheesecake') {
		res.send(req.query['hub.challenge'])
	}
	res.send('Error, wrong token')
})
if(!module.parent){ 
    var server = app.listen(app.get('port'), function() {
		console.log('Server is running on port ', app.get('port'))
		setGetStarted()
	})
}

/**
 * When Facebook message event received
 */
app.post('/webhook/', function(req, res) {
	let messageEvents = req.body.entry[0].messaging
	handleMessagingEvents(messageEvents)
	res.sendStatus(200)
})

/**
 * When Spotify login success
 */
app.get('/callback/', function(req, res) {
	let authenticationCode = req.query.code,
	    facebookId = req.query.state
	handleCreateHost(authenticationCode, facebookId)
	res.send("Thank you! Please return to Messenger to continue.")
})

function handleMessagingEvents(messageEvents) {
	// get all events
	for (let i = 0; i < messageEvents.length; i++) {
		let event = messageEvents[i]
		
		if (event.message && event.message.text) {
			handleMessage(event)
		}
		
		if (event.postback) {
			handlePostback(event)
		}
	}
}

function handleMessage(event) {
	if (event.message.is_echo === true) {
		return
	}
	let messageText = event.message.text,
		senderId = event.sender.id
	console.log("Message received: '" + messageText + "' from " + senderId)
	
	typingIndicator(senderId, false)

	
	if (util.hasSongRequest(senderId)) {
		let songRequest = util.getSongRequest(senderId)
		let responseMessages = util.handleOutstandingSongRequest(songRequest, senderId, messageText)
		for (let message of responseMessages) {
			console.error(message.senderId + " " + message.messageContent)
			sendSingleMessage(message.senderId, message.messageContent)
		}
		return
	}

	let messageDataSeries = util.responseBuilder(senderId, messageText)
	setTimeout(function() {
		sendMultipleMessages(senderId, messageDataSeries, 0)
	}, 300)
}

function handlePostback(event) {
	let load = JSON.parse(event.postback.payload),
		senderId = event.sender.id
  	console.info("Postback received of type: " + JSON.stringify(load.type) + " from " + senderId)
	
	switch (load.type) {
		case "preview":
			if (load.url.includes("mp3-preview")) {
				sendSingleMessage(senderId, "Here's a preview of '" + load.name + "' by " + load.artist + ":")
				sendSingleMessage(senderId, util.audioAttachmentResponse(load.url))
			} else {
				sendSingleMessage(senderId, strings.noPreviewAvailableMessage)
			}
			break

		case "request":
			//TODO: save in database instead
			if (util.hasSongRequest(senderId)) {
				sendSingleMessage(senderId, strings.noHostCodeSentMessage)
				break
			}
			
			util.addSongRequest(senderId, 
				{
					songId: load.id,
					songName: load.name,
					artist: load.artist,
					preview: load.url
				})

			sendSingleMessage(senderId, strings.hostCodeRequestMessage)
			break

		case "requestapprove":
			let responseMessages = util.handleApproveSongRequest(load)
			setTimeout(function() {
				for (let message of responseMessages) {
					sendSingleMessage(message.senderId, message.messageContent)
				}
			}, 1000);
			break

		case "getstarted":
			setTimeout(function() {
				sendMultipleMessages(senderId, introResponse(), 0)
			}, 300)
			break

		default:
			console.error("Postback for undefined received from " + senderId)
			sendSingleMessage(senderId, strings.responseUnknown)
			break	
	}
}

/**
 * Initiates host creation
 * @param {String} authenticationCode
 * @param {String} facebookId
 */
function handleCreateHost(authenticationCode, facebookId) {
	// TODO: better code generation
	let passcode = facebookId.substring(4,8)

	util.createHost(authenticationCode, facebookId)
		.then(function(hostData) {
			sendSingleMessage(
				facebookId, 
				"Authentication complete: your playlist passcode and name is " + passcode + ". Tell your friends!"
			)
			util.addHost(String(passcode), hostData)
		}, function(err) {
			sendSingleMessage(facebookId, strings.spotifyConnectError)
		})
}

/**
 * Sends an array of messages recursively to maintain order
 * @param {String} senderId
 * @param {Array} messages 
 * @param {int} position
 */
function sendMultipleMessages(senderId, messages, position) {
	console.log("Sending series: " + messages)
	if (position < messages.length) {
		typingIndicator(senderId, true)
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
				sendMultipleMessages(senderId, messages, position+1)
			})
		},300)
	} else {
		return
	}
}

/**
 * Sends a single message
 * @param {String} senderId
 * @param {String} message
 */
function sendSingleMessage(senderId, message) {
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
}

/**
 * Initiates a typing indicator
 * @param {String} senderId
 * @param {Boolean} status Indicator on or off
 */
function typingIndicator(senderId, status) {
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

/**
 * Prompts Facebook to activate a Get Started page
 */
function setGetStarted() {
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
}

module.exports = {
	setGetStarted,
	handlePostback,
	sendSingleMessage,
	sendMultipleMessages
}