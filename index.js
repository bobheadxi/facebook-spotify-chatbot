'use strict'

var express = require('express'),
	bodyParser = require('body-parser'),
	app = express(),
	strings = require('./res/strings-en.json')
	BackendModule = require('./src/backend-module.js')

const fbToken = process.env.FB_TOKEN,
	  fbMessageApiUrl = "https://graph.facebook.com/v2.6/me/messages"

var last_updated = new Date(),
    backendModule = new BackendModule()

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
		backendModule.setGetStarted()
	})
}

/**
 * When Facebook message event received
 */
app.post('/webhook/', function(req, res) {
	let messageEvents = req.body.entry[0].messaging

	backendModule.handleMessagingEvents(messageEvents)

	res.sendStatus(200)
})

/**
 * When Spotify login success
 */
app.get('/callback/', function(req, res) {
	let authenticationCode = req.query.code,
		facebookId = req.query.state
		
	backendModule.handleCreateHost(authenticationCode, facebookId)
})