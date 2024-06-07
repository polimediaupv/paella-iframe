import Events from './Events';
import {Player, VideoIdToUrlCallback} from './Player';

type loadVideoByIdParams = {
    videoId: string,
    startSeconds?: number,
    endSeconds?: number
}
type loadVideoByUrlParams = {
    mediaContentUrl: string,
    startSeconds?: number,
    endSeconds?: number
}

type cuePlaylistParams = {
    listType: string,
    list: string,
    index: number,
    startSeconds: number
}

type StateCache = {
    state: -1 | 0 | 1 | 2 | 3 | 5,
    currentTime: number,
    volume: number,
    duration: number,
    playbackRate: number
}

type YoutubeEventCallback = (event: object) => void;
const YT_EVENTS = {
    ON_READY: 'onReady',
    ON_STATE_CHANGE: 'onStateChange',
    ON_PLAYBACK_QUALITY_CHANGE: 'onPlaybackQualityChange',
    ON_PLAYBACK_RATE_CHANGE: 'onPlaybackRateChange',
    ON_ERROR: 'onError',
    // 'onApiChange'
    // 'onAutoplayBlocked'
};

type YTPlayerInitParams = {
    width?: number | string,
    height?: number | string,
    videoId?: string,
    playerVars?: {
        autoplay?: number | boolean,
        controls?: number | boolean
    },
    events?: {
        onReady?: YoutubeEventCallback,
        onStateChange?: YoutubeEventCallback,
        onPlaybackQualityChange?: YoutubeEventCallback,
        onPlaybackRateChange?: YoutubeEventCallback,
        onError?: YoutubeEventCallback,
        onApiChange?: YoutubeEventCallback,
        onAutoplayBlocked?: YoutubeEventCallback
    },

    // Extra
    title?: string,
    videoIdToUrl?: VideoIdToUrlCallback
}

export class YTPlayer {
    __eventListeners__: {
        [key: string]: YoutubeEventCallback[]
    } = {};
    _player: Player;
    _stateCache: StateCache = {
        duration: 0,
        state: -1,

        currentTime: 0,
        volume: 0,
        playbackRate: 1
    };

    constructor(elementId:string, params: YTPlayerInitParams = {}) {
        this._player = new Player(elementId, {
            title: params.title,
            width: params.width,
            height: params.height,
            videoId: params.videoId,
            videoIdToUrl: params.videoIdToUrl,
        });
        
        if ((params as any).events.onStateChange) {
            this.addEventListener(YT_EVENTS.ON_STATE_CHANGE, (params as any).events.onStateChange);
        }
        if ((params as any).events.onReady) {
            this.addEventListener(YT_EVENTS.ON_READY, (params as any).events.onReady);
        }

        this._player.bindEvent(Events.PLAY, (event, params) => {
            this._stateCache.state = 1;
            this._onStateChangeHandler();
        });
        this._player.bindEvent(Events.PAUSE, (event, params) => {
            this._stateCache.state = 2;
            this._onStateChangeHandler();
        });
        this._player.bindEvent(Events.ENDED, (event, params) => {
            this._stateCache.state = 0;
            this._onStateChangeHandler();
        });

        this._player.bindEvent(Events.MANIFEST_LOADED, (event, params) => {
            this._stateCache.state = 5;
            this._onStateChangeHandler();
            this._onReadyHandler();
        });

        this._player.bindEvent(Events.PLAYER_LOADED, (event, params) => {
            this._player.duration().then((duration) => {
                this._stateCache.duration = duration;
            });
        });
        this._player.bindEvent(Events.TIMEUPDATE, (event, params) => {
            this._stateCache.currentTime = (params as any).currentTime;
        });
        this._player.bindEvent(Events.VOLUME_CHANGED, (event, params) => {
            this._stateCache.volume = (params as any).volume * 100;
        });
        this._player.bindEvent(Events.PLAYBACK_RATE_CHANGED, (event, params) => {
            this._stateCache.playbackRate = (params as any).newPlaybackRate;
            this._onPlaybackRateChangeHandler();
            
        });
        this._player.bindEvent(Events.VIDEO_QUALITY_CHANGED, (event, params) => {
            var newQuality = (params as any).newQuality;
            this._onPlaybackQualityChangeHandler(newQuality);
        });

    }

    // Queueing functions
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * This function loads the specified video's thumbnail and prepares the player to play the video.
     * The player does not request the FLV until playVideo() or seekTo() is called.
     */
    cueVideoById(videoId: string, startSeconds?: number): void;
    cueVideoById(params: loadVideoByIdParams): void;
    cueVideoById(param: string | loadVideoByIdParams, startSeconds?: number): void {
        if (this._player._videoIdToUrl === null) {
            throw new Error('videoIdToUrl is not defined');
        }

        if (typeof param === 'string') {
            const videoId = param;
            this.loadVideoByUrl(this._player._videoIdToUrl(videoId), startSeconds);
        }
        else {
            this.loadVideoByUrl({
                mediaContentUrl: this._player._videoIdToUrl(param.videoId),
                startSeconds: param.startSeconds,
                endSeconds: param.endSeconds
            });
        }
    }

    /**
     * This function loads and plays the specified video.
     */
    loadVideoById(videoId: string, startSeconds?: number): void;
    loadVideoById(params: loadVideoByIdParams): void;
    loadVideoById(param: string | loadVideoByIdParams, startSeconds?: number) {
        if (typeof param === 'string') {
            return this.cueVideoById(param, startSeconds);
        }
        this.cueVideoById(param);
    }

    /**
     * This function loads the specified video's thumbnail and prepares the player to play the video.
     * The player does not request the FLV until playVideo() or seekTo() is called.
     */
    cueVideoByUrl(mediaContentUrl:string, startSeconds?: number): void;
    cueVideoByUrl(params: loadVideoByUrlParams): void
    cueVideoByUrl(param: string | loadVideoByUrlParams, startSeconds?: number) {
        if (typeof param === 'string') {
            const trimming = {startTrimming: startSeconds};
            this._player.loadVideoByUrl(param, {trimming});
        }
        else {
            const trimming = { startTrimming: param.startSeconds, endTrimming: param.endSeconds }
            this._player.loadVideoByUrl(param.mediaContentUrl, {trimming});
        }
    }

    /**
     * This function loads and plays the specified video.
     */
    loadVideoByUrl(mediaContentUrl: string, startSeconds?: number): void;
    loadVideoByUrl(params: loadVideoByUrlParams): void
    loadVideoByUrl(param: string | loadVideoByUrlParams, startSeconds?: number) {
        if (typeof param === 'string') {
            return this.cueVideoByUrl(param, startSeconds);
        }
        this.cueVideoByUrl(param);
    }

    
    // Queueing functions for lists
    ///////////////////////////////////////////////////////////////////////////
    cuePlaylist(playlist: string|Array<string>, index?: number, startSeconds?: number): void;
    cuePlaylist(params: cuePlaylistParams): void;
    cuePlaylist(param: string | Array<string> | cuePlaylistParams, index?: number, startSeconds?: number): void {
        throw new Error('Not implemented');
    }

    // Playback controls and player settings
    // https://developers.google.com/youtube/iframe_api_reference#playing-a-video
    ///////////////////////////////////////////////////////////////////////////
    playVideo(): void {
        this._player.play();
    }
    pauseVideo(): void {
        this._player.pause();
    }
    stopVideo(): void {
        this._player.stop();
    }
    seekTo(seconds: number, _allowSeekAhead: boolean): void {
        this._player.setCurrentTime(seconds);
    }

    // Controlling playback of 360° videos
    // https://developers.google.com/youtube/iframe_api_reference#Spherical_Video_Controls
    ///////////////////////////////////////////////////////////////////////////
    getSphericalProperties() {
        throw new Error('Not implemented');
    }
    setSphericalProperties(_properties: object) {
        throw new Error('Not implemented');
    }

    // Playing a video in a playlist
    // https://developers.google.com/youtube/iframe_api_reference#playing-a-video-in-a-playlist
    ///////////////////////////////////////////////////////////////////////////
    nextVideo(): void {
        throw new Error('Not implemented');
    }
    previousVideo(): void {
        throw new Error('Not implemented');
    }
    playVideoAt(_index: number): void {
        throw new Error('Not implemented');
    }

    // Changing the player volume
    // https://developers.google.com/youtube/iframe_api_reference#changing-the-player-volume
    ///////////////////////////////////////////////////////////////////////////
    /**
     * Mutes the player.
     */
    mute(): void {
        this._player.setVolume(0);
    }
    /**
     * Unmutes the player.
     */
    unMute(): void {
        this._player.setVolume(100);
    }
    /**
     * Returns true if the player is muted, false if not.
     */
    isMuted() {
        return (this._stateCache.volume === 0);
    }
    /**
     * Sets the volume. 
     * @param volume Accepts an integer between 0 and 100.
     */

    setVolume(volume: number){
        this._player.setVolume(volume/100);
    }
    /**
     * Returns the player's current volume, an integer between 0 and 100.
     */
    getVolume(): number {
        return this._stateCache.volume;
    }

    // Setting the player size
    // https://developers.google.com/youtube/iframe_api_reference#setting-the-player-size
    ///////////////////////////////////////////////////////////////////////////
    /**
     * Sets the size in pixels of the <iframe> that contains the player.
     */
    setSize(width:Number, height:Number): object {
        this._player.getIframe().width = width.toString();
        this._player.getIframe().height = width.toString();
        return { width, height }
    }

    // Setting the playback rate
    // https://developers.google.com/youtube/iframe_api_reference#Playback_rate
    ///////////////////////////////////////////////////////////////////////////
    /**
     * This function retrieves the playback rate of the currently playing video.
     * The default playback rate is 1, which indicates that the video is playing at normal speed.
     * Playback rates may include values like 0.25, 0.5, 1, 1.5, and 2.
     */
    getPlaybackRate(): number {
        return this._stateCache.playbackRate;
    }
    /**
     * This function sets the suggested playback rate for the current video.
     */
    setPlaybackRate(suggestedRate: number): void {
        this._player.setPlaybackRate(suggestedRate);
    }
    /**
     * This function returns the set of playback rates in which the current video is available.
     * The default value is 1, which indicates that the video is playing in normal speed.
     */
    getAvailablePlaybackRates(): Array<number> {
        return [0.25, 0.5, 1, 1.5, 2];
    }

    // Setting playback behavior for playlists
    // https://developers.google.com/youtube/iframe_api_reference#setting-playback-behavior-for-playlists
    ///////////////////////////////////////////////////////////////////////////
    /**
     * This function indicates whether the video player should continuously play a playlist or if it should stop
     * playing after the last video in the playlist ends. The default behavior is that playlists do not loop.
     */
    setLoop(_loopPlaylists: boolean): void {
        throw new Error('Not implemented');
    }
    /**
     * This function indicates whether a playlist's videos should be shuffled so that they play back
     * in an order different from the one that the playlist creator designated.
     */
    setShuffle(_shufflePlaylist:boolean): void {
        throw new Error('Not implemented');
    }

    // Playback status
    // https://developers.google.com/youtube/iframe_api_reference#Playback_status
    ///////////////////////////////////////////////////////////////////////////
    
    /**
     * Returns a number between 0 and 1 that specifies the percentage of the video that the player shows as buffered.
     */
    getVideoLoadedFraction(): number {
        throw new Error('Not implemented');
    }

    /**
     * Returns the state of the player. Possible values are:
     *   -1 – unstarted
     *   0 – ended
     *   1 – playing
     *   2 – paused
     *   3 – buffering
     *   5 – video cued
     * @returns 
     */
    getPlayerState(): number {
        return this._stateCache.state;
    }

    /**
     * Returns the elapsed time in seconds since the video started playing.
     */
    getCurrentTime(): number {
        return this._stateCache.currentTime;
        //return this._player.currentTime();
    }


    // Retrieving video information
    // https://developers.google.com/youtube/iframe_api_reference#Retrieving_video_information
    ///////////////////////////////////////////////////////////////////////////

    /**
     * Returns the duration in seconds of the currently playing video. 
     * Note that getDuration() will return 0 until the video's metadata is loaded,
     * which normally happens just after the video starts playing.
     */
    getDuration(): number {
        return this._stateCache.duration;
    }

    /**
     * Returns the URL for the currently loaded/playing video.
     */
    getVideoUrl(): string {
        return this._player.getIframe().src;
    }

    /**
     * Returns the embed code for the currently loaded/playing video.
     */
    getVideoEmbedCode(): string {
        return this._player.getIframe().outerHTML;
    }

    // Retrieving playlist information
    // https://developers.google.com/youtube/iframe_api_reference#Retrieving_playlist_information
    ///////////////////////////////////////////////////////////////////////////

    /**
     * This function returns an array of the video IDs in the playlist as they are currently ordered
     */
    getPlaylist():Array<string> {
        throw new Error('Not implemented');
    }

    /**
     * This function returns the index of the playlist video that is currently playing.
     */
    getPlaylistIndex():Number {
        throw new Error('Not implemented');
    }

    // Adding or removing an event listener
    // https://developers.google.com/youtube/iframe_api_reference#Adding_event_listener
    ///////////////////////////////////////////////////////////////////////////

    /**
     * Adds a listener function for the specified event.
     * @param event event to listen
     * @param listener the function that will execute when the specified event fires
     */
    addEventListener(event: string, listener: YoutubeEventCallback): void {
        this.__eventListeners__[event] = this.__eventListeners__[event] || [];
        this.__eventListeners__[event].push(listener);
    }

    /**
     * Removes a listener function for the specified event
     */
    removeEventListener(event: string, listener: YoutubeEventCallback): void {
        if (event in this.__eventListeners__) {
            const index = this.__eventListeners__[event].indexOf(listener);
            if (index > -1) {
                this.__eventListeners__[event].splice(index, 1);
            }
        }
    }

    // Accessing and modifying DOM nodes
    // https://developers.google.com/youtube/iframe_api_reference#Accessing_and_Modifying_DOM_Nodes
    ///////////////////////////////////////////////////////////////////////////

    /**
     * This method returns the DOM node for the embedded <iframe>
     */
    getIframe(): object {
        return this._player.getIframe();
    }

    /**
     * Removes the <iframe> containing the player.
     */
    destroy(): void {
        throw new Error('Not implemented');
        // this._player.destroy();
    }


    _onReadyHandler() {
        this.__eventListeners__[YT_EVENTS.ON_READY].forEach((listener) => {
            listener({target: this, data: null});
        });
    }
    _onStateChangeHandler() {
        this.__eventListeners__[YT_EVENTS.ON_STATE_CHANGE].forEach((listener) => {
            listener({ target: this, data: this._stateCache.state });
        });
    }

    _onPlaybackQualityChangeHandler(newQuality: string) {
        this.__eventListeners__[YT_EVENTS.ON_PLAYBACK_QUALITY_CHANGE].forEach((listener) => {
            listener({target: this, data: newQuality});
        });
    }
    _onPlaybackRateChangeHandler() {
        this.__eventListeners__[YT_EVENTS.ON_PLAYBACK_RATE_CHANGE].forEach((listener) => {
            listener({target: this, data: this._stateCache.playbackRate});
        });
    }
    _onErrorHandler(code: number, msg: string) {
        this.__eventListeners__[YT_EVENTS.ON_ERROR].forEach((listener) => {
            listener({target: this, data: code, msg});
        });
    }
}
