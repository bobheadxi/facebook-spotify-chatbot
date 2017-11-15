var SpotifyWebApi = require("spotify-web-api-node")

/**
 * Contains a host and all host-associated operations
 * Contains an instance of SpotifyWebApi
 */
class Host {
    constructor(
        facebookId,
        spotifyId,
        accessToken,
        refreshToken,
        playlistName,
        public=false
    ) {
        this.facebookId = facebookId
        this.spotifyId = spotifyId
        this.spotifyApi = new SpotifyWebApi({
            clientId:process.env.SPOTIFY_CLIENT_ID,
            clientSecret:process.env.SPOTIFY_CLIENT_SECRET,
            redirectUri:process.env.SPOTIFY_REDIRECT_URI,
            accessToken:accessToken,
            refreshToken:refreshToken
        })
        _createPlaylist(playlistName,public)
    }

    /**
     * Get Facebook user associated with this host
     */
    getFacebookId() {
        return this.facebookId
    }

    /**
     * Approve a song request for given songId, 
     * adding it to this host's playlist.
     * @param {*} songId 
     * @param {*} spotifyApi 
     * @param {*} host 
     */
    approveSongRequest(
        songId,
        spotifyApi=this.spotifyApi,
        host=this
    ) {
        if (!host.playlistId) return // TODO: exceptions
        spotifyApi.refreshAccessToken()
        .then(function(data) {
            spotifyApi.addTracksToPlaylist(
                host.spotifyId, 
                host.playlistId, 
                ["spotify:track:" + songId]
            ).then(function(data) {
                resolve()
            })
        }).catch(function(err) {
            console.error("Problem confirm request: ", err)
            reject(err)
        })
    }

    _createPlaylist(name,public,spotifyApi=this.spotifyApi) {
        let date = new Date()
        spotifyApi.createPlaylist(
            spotifyId,
            "Spotify Chatbot Playlist"+date, 
            {'public':public}
        ).then(function(data) {
            let playlistId = data.body.id
            console.log('Created playlist, id is ' + playlistId)
            this.playlistId = playlistId
        })
    }
}