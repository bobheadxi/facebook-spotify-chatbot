'use strict'
var bot = {}

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
var pg = require('pg')
var last_updated = new Date()

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
app.listen(app.get('port'), function() {
	console.log('Server is running on port ', app.get('port'))
	setGetStarted();
})

// ------------------------------------------------------------------
// -------------------------- Spotify API ---------------------------
// ------------------------------------------------------------------
// Source: https://github.com/thelinmichael/spotify-web-api-node, Copyright (c) 2014 Michael Thelin, MIT License

var SpotifyWebApi = require("spotify-web-api-node")
const spotifyClientId = process.env.SPOTIFY_CLIENT_ID
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET
const spotifyRedirectUri = process.env.SPOTIFY_REDIRECT_URI
var redirectUri = spotifyRedirectUri
var spotifyClientAccessToken

// Initiate Spotify stuff
var spotifyApi = new SpotifyWebApi({
  clientId : spotifyClientId,
  clientSecret : spotifyClientSecret,
  redirectUri : redirectUri
})

spotifyApi.clientCredentialsGrant()
  .then(function(data) {
  	console.log("Spotify access token request success!")

    
	spotifyClientAccessToken = data.body['access_token']
	spotifyApi.setAccessToken(spotifyClientAccessToken)
    
  	}, function(err) {
        console.error("Spotify access token request error: " + err)
  	})

var expiry = new Date()
expiry.setSeconds(expiry.getSeconds() + 3600)

// ------------------------------------------------------------------
// ------------------------- Database (PG) --------------------------
// ------------------------------------------------------------------
// Source: https://devcenter.heroku.com/articles/heroku-postgresql 

// TODO: user for song requests? something else??? what do

pg.defaults.ssl = true
pg.connect(process.env.DATABASE_URL, function(err, client) {
  if (err) throw err
  console.log('Connected to postgres! Getting schemas...')

  client
    .query('SELECT table_schema,table_name FROM information_schema.tables;')
    .on('row', function(row) {
      console.log(JSON.stringify(row))
    });
});


// ------------------------------------------------------------------
// --------------------------- Functions ----------------------------
// ------------------------------------------------------------------

// TODO: replace with database tables
var songRequests = new Map() //array of sender_id that the bot is waiting for a passphrase from
							 // key: sender, val: {songId, songName, artist, preview}
var hostList = new Map() //array of hosts and their associated passcodes and stuff
						 // key: passcode, val: {fbId, spotifyId, playlistId, accessToken, refreshToken}


// RESPOND to incoming facebook stuff
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

			// waiting for passphrase from this user?
			let songReq = songRequests.get(sender)
			if (songReq) {
				if (text.toLowerCase() === 'cancel') {
					songRequests.delete(sender)
					send(sender, "Your song request has been cancelled.")
					continue
				}

				let host = hostList.get(text)
				if (host) {
					songReq.passcode = text
					songReq.sender = sender
					songReq.type = "requestapprove"
					let buttonTemplate = {
    					"attachment":{
    						"type":"template",
      						"payload":{
        						"template_type":"button",
        						"text":"A user has requested the song " + songReq.songName 
										+ " by " + songReq.artist,
       							"buttons":[
									{
									"type": "postback",
									"title": "Preview",
									"payload": '{"type": "preview","url": "' + songReq.preview
										+ '","name": "' + songReq.songName
										+ '","artist": "' + songReq.artist + '"}'
									},
          							{
            						"type": "postback",
									"title": "Approve Song",
            						"payload": JSON.stringify(songReq)
          							}
        						]
      						}
      					}
					}
					send(host.fbId, buttonTemplate)
					songRequests.delete(sender)
					send(sender, "Your song request has been delivered.")
				} else {
					send(sender, "That is not a valid host code - ask your host again to make sure, or send 'cancel' to cancel your request.")
				}
				continue
			}
			
			console.log("Message received: '" + text + "' from " + sender)

			let messageDataSeries = bot.responseBuilder(sender, text)

			setTimeout(function(){
				sendMessages(sender, messageDataSeries, 0)
			},300)
		}

		// handle incoming postback events
		if (event.postback) {
			var load = JSON.parse(event.postback.payload)
			console.log("Postback received of type: " + JSON.stringify(load.type))
			switch(load.type) {
				// Handle request for song preview
				case "preview":
					console.log("Postback for preview received from " + sender)
					if (load.url.includes("mp3-preview")) {
						send(sender, "Here's a preview of '" + load.name + "' by " + load.artist + ":")
						send(sender, audioAttachmentResponse(load.url))
					} else {
						send(sender, "Sorry, no preview is available for this song. You can tap the album art to open the song in Spotify.")
					}
					break
				// Handle a song request
				case "request":
					console.log("Postback for request received from " + sender)
					
					//TODO: save in database instead
					if (songRequests.has(sender)) {
						send(sender, "Please send a valid passcode before requesting more songs. Send 'Cancel' to cancel your request.")
						continue
					}
					songRequests.set(sender, {songId:load.id, songName:load.name, artist:load.artist, preview:load.url})
					send(sender, "Please send the passcode for your host's playlist.")

					break
				// Handle song request approval
				case "requestapprove":
					console.log("Postback for requestconfirm received from " + sender)
					let host = hostList.get(load.passcode)
					// host is {fbId, spotifyId, playlistId, accessToken, refreshToken, sender}
					// load is {passcode, sender, songId, songName, artist, preview}

					// set auth to user, refresh token, add to playlist, set auth back to client
					spotifyApi.setAccessToken(host.accessToken)
    				spotifyApi.setRefreshToken(host.refreshToken)
					spotifyApi.refreshAccessToken()
  					.then(function(data) {
    					console.log('The access token has been refreshed!');
    					spotifyApi.setAccessToken(data.body['access_token']);

						spotifyApi.addTracksToPlaylist(host.spotifyId, host.playlistId, ["spotify:track:" + load.songId])
						.then(function(data) {
							send(sender, load.songName + " has been added to your playlist.")
							send(load.sender, "Your song request for " + load.songName + " has been approved!")
							spotifyApi.setAccessToken(spotifyClientAccessToken)
						})
  					}).catch(function(err) {
   						console.error('Problem confirm request: ', err);
						send(sender, "There was a problem approving the song.")
						send(load.sender, "There was a problem approving the song.")
						spotifyApi.setAccessToken(spotifyClientAccessToken)
  					})
					break
				// Handle get started button
				case "getstarted":
					console.log("Postback for getstarted received from " + sender)
					setTimeout(function(){
						sendMessages(sender, introResponse(), 0)
					},300)
					break
				default:
					console.error("Postback for undefined received from " + sender)
					send(sender, "Sorry, I don't know how to do that yet :(")
					break
			}
			continue
		}
	}
	res.sendStatus(200)
	
})

// RESPOND to Spotify User Login, get Auth codes
app.get('/callback/', function(req, res) {
	var code = req.query.code
	var fb_id = req.query.state
	var passcode = fb_id.substring(4,8)

	// Request auth codes, get user info, create playlist, save everything, set auth back to client
	spotifyApi.authorizationCodeGrant(code)
  	.then(function(data) {
		var token_expiry = data.body['expires_in']
		var access_token = data.body['access_token']
		var refresh_token = data.body['refresh_token']
    	spotifyApi.setAccessToken(access_token)

		spotifyApi.getMe()
		.then(function(data) {
			var spotify_id = data.body.id
			console.log('User data request success! Id is ' + spotify_id)		

			// TODO: check if playlist already exists
			// (passcode, fb_id, spotify_id, playlist_id, access_token, refresh_token, [TODO: token_expiry])
			spotifyApi.createPlaylist(spotify_id, passcode, { 'public' : false })
			.then(function(data) {
				var playlist_id = data.body.id
				console.log('Created playlist, id is ' + playlist_id);
				let confirm = "Authentication complete: your playlist passcode and name is " 
									+ passcode + ". Tell your friends!"
				send(fb_id, confirm)

				spotifyApi.setAccessToken(spotifyClientAccessToken)

				// TODO: Save in database instead
				hostList.set(String(passcode), {
					fbId:fb_id,
					spotifyId:spotify_id,
					playlistId:playlist_id,
					accessToken:access_token,
					refreshToken:refresh_token
				})
  			})
 		})
  	}).catch(function(err) {
    	console.error('Something went wrong with Spotify authentication: ', err)
		send(fb_id, "There was a problem connecting to your Spotify account :(")
		spotifyApi.setAccessToken(spotifyClientAccessToken)
  	})
	
	res.send("Authentication complete! Go back to Messenger to continue.")
})

// MESSAGE: Choose appropriate response
bot.responseBuilder = function (sender, text) {
	var keyword = text.toLowerCase()
	if (text.includes(" ")) {
		keyword = keyword.substring(0, keyword.indexOf(" "))
	}
	console.log("Keyword: ", keyword)
	
	switch (keyword) {
		case "help":
			return introResponse()
		case "about":
			return aboutResponse()
		case "search":
			return searchResponse(text)
		case "host":
			return loginResponse(sender)
		/* Disable for releases
		case "code":
			return devDataFeedback()
		*/		
		default:
			return ["I am not sure how to respond to that. Type 'Help' to get tips!"]
	}
}

// for research, add to "keyword" for dev
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
	series.push("Hello! I am a Spotify chatbot")
	series.push("Type 'Search' followed by the name of a song you would like to find! For example, you could send me 'search modest mouse' to find songs from the best band ever.")
	series.push("Type 'Host' to host your own crowdsourced playlist!")
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
	series.push("For release notes go to https://github.com/bobheadxi/facebook-spotify-chatbot/releases")
	return series
}

// MESSAGE: create login link, do login thing
function loginResponse(sender) {
	var scopes = ['user-read-private', 'playlist-read-collaborative', 'playlist-modify-private', 'playlist-modify-public'],
   		state = sender // note on 'state': useful for correlating requests and responses 
		   			   // (https://developer.spotify.com/web-api/authorization-guide/)
	var authoriseURL = spotifyApi.createAuthorizeURL(scopes, state)
	console.log("Login URL created: ", authoriseURL)
	let series = []
	
	let buttonTemplate = {
    	"attachment":{
    		"type":"template",
      		"payload":{
        		"template_type":"button",
        		"text":"Click this button to log in and create a new playlist!",
       			"buttons":[
          			{
            			"type":"web_url",
						"title":"Log in to Spotify",
            			"url":authoriseURL
            			
          			}
        		]
      		}
      	}
	}
	series.push(buttonTemplate)
	return series
}

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
								+ '","artist": "' + item.artists[0].name 
								+ '","url": "' + item.preview_url + '"}'
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

// Sets a greeting page for new users
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