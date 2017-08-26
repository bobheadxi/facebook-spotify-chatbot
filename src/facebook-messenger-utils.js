'use strict'

const spotifyModule = require('./spotify-module.js')
var strings = require('../res/strings-en.json')

// TODO: replace with database tables
/**
 * Map of sender_id that the bot is waiting for a passphrase from
 * - KEY: sender 
 * - VAL: {songId, songName, artist, preview}
 * @var {Map} songRequests
 */
var songRequests = new Map() 

/**
 * Mapp of hosts and their associated passcodes and information
 * - KEY: passcode
 * - VAL: {fbId, spotifyId, playlistId, accessToken, refreshToken}
 * @var {Map} hostList
 */
var hostList = new Map() 

/**
 * Determines appropriate response message
 * @param {String} senderId 
 * @param {String} messageText
 * @return {Array} responseMessages
 */
function responseBuilder(senderId, messageText) {
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
			return searchResponse(messageText)
		case "host":
			return loginResponse(senderId)
		default:
			return strings.responseDefault
	}
}

/**
 * Formats input message and calls search and message assembly
 * @param {String} text
 * @return {Array} messageSeries
 */
function searchResponse(messageText) {
	var searchTerm = messageText.substring(6,200) // exclude word "search"

	let messageSeries = []

	if (searchTerm.length<2) {
		messageSeries = [strings.noSearchTerm]
		return messageSeries
	}
	
	spotifyModule.search(searchTerm)
		.then(function(data) {
			let result = assembleSearchResponse(data)
			for (var i = 0; i < result.length; i++)
				messageSeries.push(result[i])
		}, function(err) {
			console.log("Error: " + err)
		})
	
	return messageSeries
}

/**
 * Create Spotify login link in a message
 * @param {String} senderId 
 * @return {Array} messageSeries
 */
function loginResponse(senderId) {
	var scopes = ['user-read-private', 'playlist-read-collaborative', 'playlist-modify-private', 'playlist-modify-public'],
   		state = senderId // note on 'state': useful for correlating requests and responses 
		   			   // (https://developer.spotify.com/web-api/authorization-guide/)
	var authoriseURL = spotifyApi.createAuthorizeURL(scopes, state)
	console.log("Login URL created: ", authoriseURL)
	let messageSeries = []
	
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
	messageSeries.push(buttonTemplate)
	return messageSeries
}

/**
 * Checks if Facebook user has outstanding song request
 * @param {Object} songRequest
 * @param {String} senderId
 * @param {String} messageText
 * @return {Array} responseMessages of {senderId, responseMessage}
 */
function handleOutstandingSongRequest(songRequest, senderId, messageText) {
	let responeMessages = []
	if (messageText.toLowerCase() === "cancel") {
		songRequests.delete(senderId)
		responseMessages.push(senderMessagePair(senderId, strings.requestCancelled))
		return responseMessages
	}

	let host = hostList.get(messageText)
	if (host) {
		songRequest.passcode = messageText
		songRequest.sender = senderId
		songRequest.type = "requestapprove"
		let buttonTemplate = { 
			attachment: { 
				type: "template", 
				payload: { 
					template_type: "button", 
					text: "A user has requested the song " + songRequest.songName + " by " + songRequest.artist, 
					buttons: [
						{ 
							type: "postback", 
							title: "Preview", 
							payload: '{"type": "preview","url": "' + songRequest.preview + '","name": "' + songRequest.songName + '","artist": "' + songRequest.artist + '"}' 
						}, 
						{ 
							type: "postback", 
							title: "Approve Song", 
							payload: JSON.stringify(songRequest) 
						}
					] 
				} 
			} 
		}
		responseMessages.push(senderMessagePair(host.fbId, buttonTemplate))
		songRequests.delete(senderId)
		responseMessages.push(senderMessagePair(senderId, strings.requestDeliverConfirm))
	} else {
		responseMessages.push(senderMessagePair(senderId, strings.invalidHostCodeMessage))
	}
	return responseMessages
}

/**
 * Handles song request approval
 * @param {Object} approveSongRequestPayload 
 * @return {Array} responseMessages of {senderId, responseMessage}
 */
function handleApproveSongRequest(approveSongRequestPayload) {
	let responseMessages = []
	let sender = approveSongRequestPayload.sender
	console.log("Postback for requestconfirm received from " + sender)
	let host = hostList.get(approveSongRequestPayload.passcode)
	// host is {fbId, spotifyId, playlistId, accessToken, refreshToken, sender}
	// load is {passcode, sender, songId, songName, artist, preview}

	spotifyModule.approveSongRequest(host, approveSongRequestPayload.songId)
		.then(function(response) {
			responseMessages.push(senderMessagePair(
				host.fbId, 
				approveSongRequestPayload.songName + " has been added to your playlist."
			))
			responseMessages.push(senderMessagePair(
				sender,
				"Your song request for " + approveSongRequestPayload.songName + " has been approved!"
			))
		}, function(err) {
			responseMessages.push(senderMessagePair(sender, strings.requestApproveError))
			responseMessages.push(senderMessagePair(host.fbId, strings.requestApproveError))
		}
	)

	return responseMessages
}

/**
 * Assembles response message from Spotify search data
 * @param {Object} searchResultData 
 * @return {Array} messageSeries
 */
function assembleSearchResponse(searchResultData) {
	let messageSeries = []
	if (data.body.tracks.total == 0) {
		messageSeries.push(strings.noSearchResult)
		return messageSeries
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

	messageSeries.push(strings.searchResultFound)
	messageSeries.push(messageData)
	return messageSeries	
}

/**
 * Assembles response message for audio attachment
 * @param {String} link
 * @return {Object} messageData
 */
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

/**
 * Sends an array of messages recursively to maintain order
 * @param {String} senderId
 * @param {Array} messageContent
 * @param {object} message
 */
function senderMessagePair(senderId, messageContent) {
	return {
		senderId:senderId,
		messageContent:messageContent
	}
}

/**
 * Adds host and host data to {@link hostList}
 * @param {String} passcode
 * @param {Object} hostData
 */
function addHost(passcode, hostData) {
    hostList.set(String(passcode), hostData)
}

/**
 * Calls createHost
 * @param {String} authenticationCode
 * @param {String} facebookId
 */
function createHost(authenticationCode, facebookId) {
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

module.exports = {
    responseBuilder,
    handleOutstandingSongRequest,
    handleApproveSongRequest,
    audioAttachmentResponse,
    addHost,
    createHost
}