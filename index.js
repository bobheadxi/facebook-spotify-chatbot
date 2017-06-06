'use strict'
var bot = {}

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
var last_updated = new Date()

// App Secrets
const fbToken = process.env.FB_TOKEN
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET
const spotifyRedirectUri = process.env.SPOTIFY_REDIRECT_URI

// ------------------------------------------------------------------
// --------------------- Facebook Messenger API ---------------------
// ------------------------------------------------------------------
// Source: https://github.com/jw84/messenger-bot-tutorial, Copyright (c) 2016 Jerry Wang, MIT License

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
app.listen(app.get('port'), function() {
	console.log('Server is running on port ', app.get('port'))
	setGetStarted();
})


// ------------------------------------------------------------------
// -------------------------- Spotify API ---------------------------
// ------------------------------------------------------------------
// Source: https://github.com/thelinmichael/spotify-web-api-node, Copyright (c) 2014 Michael Thelin, MIT License

var SpotifyWebApi = require("spotify-web-api-node")
var redirectUri = spotifyRedirectUri

// Initiate Spotify stuff
var spotifyApi = new SpotifyWebApi({
  clientId : spotifyClientId,
  clientSecret : spotifyClientSecret,
  redirectUri : redirectUri
})

spotifyApi.clientCredentialsGrant()
  .then(function(data) {
  	console.log("Spotify access token request success!")

    spotifyApi.setAccessToken(data.body['access_token'])
    
  	}, function(err) {
        console.error("Spotify access token request error: " + err)
  	})

var expiry = new Date()
expiry.setSeconds(expiry.getSeconds() + 3600)

// ------------------------------------------------------------------
// --------------------------- Functions ----------------------------
// ------------------------------------------------------------------

// Incoming Facebook data handling
app.post('/webhook/', function(req, res) {
	let messaging_events = req.body.entry[0].messaging
	
	// get all events
	for (let i = 0; i < messaging_events.length; i++) {
		let event = req.body.entry[0].messaging[i]
		let sender = event.sender.id

		// handle incoming messages
		if (event.message && event.message.text) {
			if (event.message.is_echo === true) {
				continue
			}
			typingIndicator(sender, "on")
			let text = event.message.text
			console.log("Message received: " + text)

			let messageDataSeries = bot.responseBuilder(text)

			setTimeout(function(){
				sendMessages(sender, messageDataSeries, 0)
			},300)
		}

		// handle incoming postback events
		if (event.postback) {
			var load = JSON.parse(event.postback.payload)
			console.log("Postback received of type: " + JSON.stringify(load.type))
			switch(load.type) {
				case "preview":
					if (load.url.includes("mp3-preview")) {
						send(sender, "Here's a preview of '" + load.name + "' by " + load.artist + ":")
						send(sender, audioAttachmentResponse(load.url))
					} else {
						send(sender, "Sorry, no preview is available for this song. You can tap the album art to open the song in Spotify.")
					}
					break
				case "request":
					//TODO
					send(sender, "This feature is coming soon!")
					break
				case "getstarted":
					setTimeout(function(){
						sendMessages(sender, introResponse(), 0)
					},300)
					break
				default:
					send(sender, "Sorry, I don't know how to do that yet :(")
					break
			}
			continue
		}

	}
	res.sendStatus(200)
	
})

// MESSAGE: Choose appropriate response
bot.responseBuilder = function (text) {
	var keyword = text.toLowerCase()
	if (text.includes(" ")) {
		keyword = keyword.substring(0, keyword.indexOf(" "))
	}
	console.log("Keyword: ", keyword)
	
	switch (keyword) {
		case "about":
			return aboutResponse()
		case "search":
			return searchResponse(text)
		case "login":
			return loginResponse()
		case "code":
			return devDataFeedback()			
		default:
			return introResponse()
	}
}

// for research
function devDataFeedback() {
	let series = []
	spotifyApi.getMe()
  		.then(function(data) {
   			console.log('Some information about the authenticated user', data.body)
			series.push(JSON.stringify(data.body))
 		}, function(err) {
    		console.log('Something went wrong!', err)
			series.push(JSON.stringify(err))
  		})
	return series
}

// MESSAGE: introduction message
function introResponse() {
	let series = []
	series.push("Hello! I am a Spotify chatbot.")
	series.push("Type 'Search' followed by the name of a song you would like to find! For example, you could send me 'search modest mouse' to find songs from the best band ever.")
	series.push("Type 'About' to learn more about me.")
	return series
}

// MESSAGE: about the bot message
function aboutResponse() {
	let series = []
	series.push("I am a personal project of Robert Lin.")
	series.push("I am a Facebook Messenger bot that interacts with Spotify to provide various services. I am a work in progress and will be receiving ongoing upgrades to my abilities.")
	series.push("If I had a more inspired name than 'Spotify-chatbot project', I would be named Bob.")
	series.push("I was last updated on: " + last_updated)
	series.push("My current Spotify client access token expires on: " + expiry)
	return series
}

// MESSAGE: create login link, do login thing
function loginResponse() {
	var scopes = ['user-read-private', 'user-read-email'],
   		state = 'xx' // note on 'state': useful for correlating requests and responses 
		   			 // (https://developer.spotify.com/web-api/authorization-guide/)
	var authoriseURL = spotifyApi.createAuthorizeURL(scopes, state)
	console.log("Login URL created: ", authoriseURL)
	let series = []
	
	let buttonTemplate = {
    	"attachment":{
    		"type":"template",
      		"payload":{
        		"template_type":"button",
        		"text":"Click this button to log in!",
       			"buttons":[
          			{
            			"type":"web_url",
            			"url":authoriseURL,
            			"title":"Log in to Spotify"
          			}
        		]
      		}
      	}
	}
	series.push(buttonTemplate)

	series.push("plz log in")
	return series
}

app.get('/callback/', function(req, res) {
	console.log(req.query.code)
	var code = req.query.code

	spotifyApi.authorizationCodeGrant(code)
  		.then(function(data) {
   			console.log('The token expires in ' + data.body['expires_in'])
    		console.log('The access token is ' + data.body['access_token'])
    		console.log('The refresh token is ' + data.body['refresh_token'])

    		spotifyApi.setAccessToken(data.body['access_token'])
    		spotifyApi.setRefreshToken(data.body['refresh_token'])
  		}, function(err) {
    		console.log('Something went wrong!', err)
  		})

	res.sendStatus(200)
})

// MESSAGE: results of search query, in the form of generic template
function searchResponse(text) {
	var searchTerm = text.substring(6,200) // exclude word "about"
	let series = []

	// conduct search
	spotifyApi.searchTracks(searchTerm)
  		.then(function(data) {
  			if (data.body.tracks.total == 0) {
				series.push("I couldn't find anything, sorry :(")
  				return
  			} else if (data.body.tracks.total < 7) {
    			var numOfResults = data.body.tracks.total
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
    			var item = data.body.tracks.items[i]
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
								+ '","artist": "' + item.artists[0].name + '"}'
					}]
				messageData.attachment.payload.elements.push(element)
    		}

			series.push("Here's what I found:")
			series.push(messageData)
  		}, function(err) {
    		console.error("Error at method searchResponse(): ", err)
  		});

	return series
}

// MESSAGE: audio preview of song
function audioAttachmentResponse(link) {
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

// SEND: array of messages, sent in order recursively
function sendMessages(sender, series, i) {
	if (i < series.length) {
		typingIndicator(sender, "on")
		let data = series[i]

		if ((typeof data) == "string") {
			data = {text:data}
		}

		setTimeout(function(){
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
					console.error("Error at method sendSeries(): ", error)
				} else if (response.body.error) {
					console.error("Error at method sendSeries(): ", response.body.error)
				}
				sendMessages(sender, series, i+1)
			})
		},300)
	} else {
		return
	}
}

// SEND: single message
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
		}

	})
}

// SEND: "Typing" indicator toggle, accepts string "on" or "off" as status
function typingIndicator(sender, status) {
	request({
		url: fbMessageApiUrl,
		qs: {access_token:fbToken},
		method: 'POST',
		json: {
			recipient: {id:sender},
			sender_action: 'typing_' + status,
		}
	}, function(error, response, body) {
		if (error) {
			console.error("Error at method typingIndicator(): ", error)
			console.error("For sender id: ", sender)
		} else if (response.body.error) {
			console.error("Error at method typingIndicator(): ", response.body.error)
			console.error("For sender id: ", sender)
		}
	})
}

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

module.exports = bot