'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const util = require('./src/facebook-messenger-utils.js')

var pg = require('pg')
var last_updated = new Date()
var strings = require('./res/strings-en.json')

// ------------------------------------------------------------------
// --------------------- Facebook Messenger API ---------------------
// ------------------------------------------------------------------
// Source: https://github.com/jw84/messenger-bot-tutorial, Copyright (c) 2016 Jerry Wang, MIT License
const fbToken = process.env.FB_TOKEN
const fbMessageApiUrl = "https://graph.facebook.com/v2.6/me/messages"

app.set("port", (process.env.PORT || 3000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get("/", function (req, res) {
	res.send("This is Robert's bot server")
})

// Initiate Facebook stuff
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'cheesecake') {
		res.send(req.query['hub.challenge'])
	}
	res.send('Error, wrong token')
})

// Start server
if(!module.parent){ 
    var server = app.listen(app.get('port'), function() {
		console.log('Server is running on port ', app.get('port'))
		setGetStarted()
	})
}

// ------------------------------------------------------------------
// ------------------------- Database (PG) --------------------------
// ------------------------------------------------------------------
// Source: https://devcenter.heroku.com/articles/heroku-postgresql 

// TODO: user for song requests? something else??? what do

/*
pg.defaults.ssl = true
pg.connect(process.env.DATABASE_URL, function(err, client) {
  if (err) throw err
  console.log('Connected to postgres! Getting schemas...')

  client
    .query('SELECT table_schema,table_name FROM information_schema.tables')
    .on('row', function(row) {
      //console.log(JSON.stringify(row))
    })
})
*/


// ------------------------------------------------------------------
// --------------------------- Functions ----------------------------
// ------------------------------------------------------------------

// RESPOND to incoming facebook stuff
app.post('/webhook/', function(req, res) {
	let messaging_events = req.body.entry[0].messaging
	
	handleMessagingEvents(messaging_events)

	res.sendStatus(200)
})

// RESPOND to Spotify User Login, get Auth codes
app.get('/callback/', function(req, res) {
	var authenticationCode = req.query.code
	var facebookId = req.query.state
	
	handleCreateHost(authenticationCode, facebookId)

	res.send("Thank you! Please return to Messenger to continue.")
})

// Handle events
function handleMessagingEvents(messaging_events) {
	// get all events
	for (let i = 0; i < messaging_events.length; i++) {
		let event = messaging_events[i]
		
		
		// handle incoming messages
		if (event.message && event.message.text) {
			handleMessage(event)
		}

		// handle incoming postback events
		if (event.postback) {
			handlePostback(event)
		}
	}
}

function handleMessage(event) {
	if (event.message.is_echo === true) {
		return
	}
	let messageText = event.message.text
	let senderId = event.sender.id
	typingIndicator(senderId, false)

	// waiting for passphrase from this user?
	let songRequest = songRequests.get(senderId)
	if (songRequest) {
		let responseMessages = util.handleOutstandingSongRequest(songRequest, senderId, messageText)
		for (var message in responseMessages) {
			send(message.senderId, message.messageContent)
		}
		return
	}

	console.log("Message received: '" + messageText + "' from " + senderId)
	let messageDataSeries = util.responseBuilder(senderId, messageText)
	setTimeout(function() {
		sendMessages(senderId, messageDataSeries, 0)
	}, 300)
}

function handlePostback(event) {
	var load = JSON.parse(event.postback.payload)
	let senderId = event.sender.id
  	console.info("Postback received of type: " + JSON.stringify(load.type) + " from " + senderId)
	switch (load.type) {
		// Handle request for song preview
		case "preview":
			if (load.url.includes("mp3-preview")) {
				send(senderId, "Here's a preview of '" + load.name + "' by " + load.artist + ":")
				send(senderId, util.audioAttachmentResponse(load.url))
			} else {
				send(senderId, strings.noPreviewAvailableMessage)
			}
			break
			// Handle a song request
		case "request":
			//TODO: save in database instead
			if (songRequests.has(senderId)) {
				send(senderId, strings.noHostCodeSentMessage)
				break
			}
			songRequests.set(senderId,
			{
				songId: load.id,
				songName: load.name,
				artist: load.artist,
				preview: load.url
			})
			send(senderId, strings.hostCodeRequestMessage)

			break
		// Handle song request approval
		case "requestapprove":
			let responseMessages = util.handleApproveSongRequest(load)
			for (var message in responseMessages) {
				send(message.senderId, message.messageContent)
			}
			break
		// Handle get started button
		case "getstarted":
			setTimeout(function() {
				sendMessages(senderId, introResponse(), 0)
			}, 300)
			break
		default:
			console.error("Postback for undefined received from " + senderId)
			send(senderId, strings.responseUnknown)
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
	var passcode = facebookId.substring(4,8)

	util.createHost(authenticationCode, facebookId)
		.then(function(hostData) {
			send(
				facebookId, 
				"Authentication complete: your playlist passcode and name is " + passcode + ". Tell your friends!"
			)
			// TODO: Save in database instead
			util.addHost(String(passcode), hostData)
		}, function(err) {
			send(facebookId, strings.spotifyConnectError)
		})
}

/**
 * Sends an array of messages recursively to maintain order
 * @param {String} senderId
 * @param {Array} messageSeries 
 * @param {int} i
 */
function sendMessages(senderId, messageSeries, i) {
	console.log("Sending series: " + messageSeries)
	if (i < messageSeries.length) {
		typingIndicator(senderId, true)
		let data = messageSeries[i]

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
				sendMessages(senderId, messageSeries, i+1)
			})
		},300)
	} else {
		return
	}
}

/**
 * Sends a single message
 * @param {String} sender
 * @param {String} messageData
 */
function send(sender, messageData) {
	let data = messageData
	if ((typeof data) == "string") {
		data = {text:data}
	}

	request({
		url: fbMessageApiUrl,
		qs: {access_token:fbToken},
		method: 'POST',
		json: {
			recipient: {id:sender},
			message: data,
		}
	}, function(error, response, body) {
		if (error) {
			console.error("Error at method send(): ", error)
		} else if (response.body.error) {
			console.error("Error at method send(): ", response.body.error)
		} else {
			console.log("Message delivered: ", messageData)
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
  send,
  sendMessages,
  server
}