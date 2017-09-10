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
    var module = this

    this._spotifyApi.clientCredentialsGrant()
    .then(function(data) {
        console.log("Spotify access token request success!")
        var spotifyClientAccessToken = data.body['access_token']
        module._spotifyClientAccessToken = spotifyClientAccessToken
        module._spotifyApi.setAccessToken(spotifyClientAccessToken)  
    }).catch(function(err) {
        console.error("Spotify access token request error", err)
    })
}

SpotifyModule.prototype = {
    /**
     * Request auth codes, get user info, create playlist, save everything, set auth back to client
     * @param {String} authenticationCode
     * @param {String} facebookId
     * @return {Promise} hostData
     */
    createHost: function(
        authenticationCode, 
        facebookId, 
        spotifyApi = this._spotifyApi,
        spotifyClientAccessToken = this._spotifyClientAccessToken
    ) {
        return new Promise(function(resolve, reject) {
            spotifyApi.authorizationCodeGrant(authenticationCode)
                .then(function(data) {
                var accessToken = data.body['access_token']
                var refreshToken = data.body['refresh_token']
                spotifyApi.setAccessToken(accessToken)
        
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
                            spotifyApi.setAccessToken(spotifyClientAccessToken)
            
                            resolve({
                                fbId:facebookId,
                                spotifyId:spotifyId,
                                playlistId:playlistId,
                                accessToken:accessToken,
                                refreshToken:refreshToken
                            })
                        })
                    })
                }).catch(function(err) {
                    console.error('Something went wrong with Spotify authentication: ', err)
                    spotifyApi.setAccessToken(spotifyClientAccessToken)
                    reject(err)
                })
        })
    },

    /**
     * Conducts Spotify search
     * @param {String} searchTerm 
     * @return {Object} searchResultData
     */
    search: function(searchTerm, spotifyApi = this._spotifyApi) {
        return new Promise(function(resolve, reject) {
            spotifyApi.searchTracks(searchTerm)
                .then(function(searchResultData) {
                    console.log("Track search success")
                    resolve(searchResultData)
                }).catch(function(err) {
                    console.error("Error at method search(): ", err)
                    reject(null)
                })
        })
    },

    /**
     * Approves song request
     * @param {Object} host
     * @param {String} songId
     * @return {Promise} songRequestApprovalSuccess
     */
    approveSongRequest: function(
        host, 
        songId, 
        spotifyApi = this._spotifyApi, 
        spotifyClientAccessToken = this._spotifyClientAccessToken
    ) {
        return new Promise(function(resolve, reject) {
            // set auth to user, refresh token, add to playlist, set auth back to client
            spotifyApi.setAccessToken(host.accessToken)
            spotifyApi.setRefreshToken(host.refreshToken)
            
            spotifyApi.refreshAccessToken()
                .then(function(data) {
                    console.log("The access token has been refreshed!")
                    spotifyApi.setAccessToken(data.body["access_token"])
                    spotifyApi
                        .addTracksToPlaylist(host.spotifyId, host.playlistId, ["spotify:track:" + songId])
                        .then(function(data) {
                            spotifyApi.setAccessToken(spotifyClientAccessToken)
                            resolve()
                        })
                }).catch(function(err) {
                    console.error("Problem confirm request: ", err)
                    spotifyApi.setAccessToken(spotifyClientAccessToken)
                    reject(err)
                })
        })
    }
}

module.exports = SpotifyModule