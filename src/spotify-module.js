'use strict'

var SpotifyWebApi = require("spotify-web-api-node")
// SpotifyWebApi Copyright (c) 2014 Michael Thelin, MIT License
// https://github.com/thelinmichael/spotify-web-api-node

/**
 * Provides access to Spotify API via spotify-web-api-node
 * @name SpotifyModule
 */
function SpotifyModule() {
    this._spotifyApi = new SpotifyWebApi({
        clientId : process.env.SPOTIFY_CLIENT_ID,
        clientSecret : process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri : process.env.SPOTIFY_REDIRECT_URI
    })

    this._spotifyApi.clientCredentialsGrant()
    .then(function(data) {
        console.log("Spotify access token request success!")
        this._spotifyClientAccessToken = data.body['access_token']
        _spotifyApi.setAccessToken(this._spotifyClientAccessToken)  
    }, function(err) {
        console.error("Spotify access token request error: " + err)
        this._spotifyClientAccessToken = null
    })
}

SpotifyModule.prototype = {
    /**
     * Request auth codes, get user info, create playlist, save everything, set auth back to client
     * @param {String} authenticationCode
     * @param {String} facebookId
     * @return {Promise} hostData
     */
    createHost: function(authenticationCode, facebookId) {
        return new Promise(function(resolve, reject) {
            _spotifyApi.authorizationCodeGrant(authenticationCode)
                .then(function(data) {
                var accessToken = data.body['access_token']
                var refreshToken = data.body['refresh_token']
                _spotifyApi.setAccessToken(accessToken)
        
                spotifyApi.getMe()
                    .then(function(data) {
                    var spotifyId = data.body.id
                    console.log('User data request success! Id is ' + spotifyId)		
        
                    // TODO: check if playlist already exists
                    // (passcode, fb_id, spotify_id, playlist_id, access_token, refresh_token, [TODO: token_expiry])
                    spotifyApi.createPlaylist(spotifyId, "Spotify Chatbot Playlist", { 'public' : false })
                        .then(function(data) {
                            var playlistId = data.body.id
                            console.log('Created playlist, id is ' + playlistId)
                            spotifyApi.setAccessToken(_spotifyClientAccessToken)
            
                            resolve({
                                fbId:facebookId,
                                spotifyId:spotifyId,
                                playlistId:playlistId,
                                accessToken:accessToken,
                                refreshToken:refreshToken
                            })
                        })
                    })
                })
                .catch(function(err) {
                    console.error('Something went wrong with Spotify authentication: ', err)
                    spotifyApi.setAccessToken(_spotifyClientAccessToken)
                    reject(err)
                })
        })
    },

    /**
     * Conducts Spotify search
     * @param {String} searchTerm 
     * @return {Object} searchResultData
     */
    search: function(searchTerm) {
        return new Promise(function(resolve, reject) {
            _spotifyApi.searchTracks(searchTerm)
                .then(function(searchResultData) {
                    console.log("Track search success")
                    resolve(searchResultData)
                }, function(err) {
                    console.error("Error at method search(): ", err)
                    reject(err)
                })
        })
    },

    /**
     * Approves song request
     * @param {Object} host
     * @param {String} songId
     * @return {Promise} songRequestApprovalSuccess
     */
    approveSongRequest: function(host, songId) {
        return new Promise(function(resolve, reject) {
            // set auth to user, refresh token, add to playlist, set auth back to client
            _spotifyApi.setAccessToken(host.accessToken)
            _spotifyApi.setRefreshToken(host.refreshToken)
            
            _spotifyApi.refreshAccessToken()
                .then(function(data) {
                    console.log("The access token has been refreshed!")
                    _spotifyApi.setAccessToken(data.body["access_token"])
                    _spotifyApi
                        .addTracksToPlaylist(host.spotifyId, host.playlistId, ["spotify:track:" + songId])
                        .then(function(data) {
                            spotifyApi.setAccessToken(_spotifyClientAccessToken)
                            resolve()
                        })
                })
                .catch(function(err) {
                    console.error("Problem confirm request: ", err)
                    spotifyApi.setAccessToken(_spotifyClientAccessToken)
                    reject(err)
                })
        })
    }
}

module.exports = SpotifyModule