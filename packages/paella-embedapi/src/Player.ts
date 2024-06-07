import Events from "./Events";

declare global {
    interface Window {
        paellaVideoIdToUrl?: VideoIdToUrlCallback
        onPaellaAuthRequired?: () => void
    }
}

type OnEventCallback = (event: string, params: object) => void;

export type VideoIdToUrlCallback = (videoId: string) => string;

export type PlayerInitParams = {
    title?: string,
    width?: number | string,
    height?: number | string,
    videoId?: string,
    videoIdToUrl?: VideoIdToUrlCallback,
    onPaellaAuthRequired?: () => void,
    onEvents?: OnEventCallback;
}

type LoadVideoParams = {
    trimming?: {
        startTrimming?: number,
        endTrimming?: number
    }
}

export class Player {
    static Events = Events;
    _functionCallingId: number = 0;
    __eventListeners__: {
        [key: string]: {callback: OnEventCallback}[]
    } = {};
    __functionCallingListeners__: {
        [key: number]: {resolve: Function, reject: Function}
    } = {};
    _onEvents: OnEventCallback | null = null;
    _iFrame: HTMLIFrameElement;
    _videoIdToUrl: ((videoId: string) => string) | null = null;
    _onPaellaAuthRequired: (() => void) | null = null;

    constructor(containerElement:HTMLElement|string, initParams:PlayerInitParams = {}) {
        this._onEvents = initParams.onEvents ?? null;
        this._videoIdToUrl = initParams.videoIdToUrl ?? window.paellaVideoIdToUrl ?? null;
        this._onPaellaAuthRequired = initParams.onPaellaAuthRequired ?? window.onPaellaAuthRequired ?? null;

        window.addEventListener('message', this, false);
        
        if (typeof (containerElement) === "string") {
            const elementFound = document.getElementById(containerElement);
            if (!elementFound) {
                throw new Error('Container element not found');
            }
    
            containerElement = elementFound
        }
        if (containerElement.tagName.toUpperCase() == 'IFRAME') {
            this._iFrame = containerElement as HTMLIFrameElement;
        }
        else {
            // Create the iFrame element
            const containerId = containerElement.id || 'player';
            this._iFrame = document.createElement('iframe');
            this._iFrame.width = `${initParams.width}` ?? '100%';
            this._iFrame.height = `${initParams.height}` ?? '100%';
            this._iFrame.style.cssText = 'resize: none; overflow: hidden; border: 0';
            this._iFrame.name = containerId;
            this._iFrame.id = containerId;
            this._iFrame.allow="autoplay; fullscreen";
            containerElement.replaceWith(this._iFrame);
        }
        this._iFrame.title = initParams.title || 'Paella Player';
        if (initParams.videoId) {
            if (!this._videoIdToUrl) {
                throw new Error('videoIdToUrl callback is required');
            }
            else {
                const url = this._videoIdToUrl(initParams.videoId);
                if (url != this._iFrame.src) {
                    this.cueVideoByUrl(url) 
                }
            }
        }
        console.log('Player created', initParams)
    }

    cueVideoByUrl(mediaContentUrl:string, params?:LoadVideoParams): void {
        if (params?.trimming && params.trimming.startTrimming && params.trimming.endTrimming) {
            this.bindEvent(Events.PLAYER_LOADED, async () => {
                // Retrieve video duration in case a default trim end time is needed
                const videoDuration = await this.duration() //paella.videoManifest?.metadata?.duration;
                // Retrieve trimming data
                const trimmingData = {
                    start: await this.trimStart() ?? 0,
                    end: await this.trimEnd() ?? videoDuration
                };

                let startTrimming: number = 0;  // default start time
                let endTrimming: number = videoDuration; // raw video duration;

                if (params?.trimming?.startTrimming) {
                    startTrimming = trimmingData.start + Math.floor(params.trimming.startTrimming);
                }
                if (params?.trimming?.endTrimming) {
                    endTrimming = Math.min(trimmingData.start + Math.floor(params.trimming.endTrimming), videoDuration);
                }

                this._functionCalling("setTrimming", {
                    enabled: true,
                    start: startTrimming,
                    end: endTrimming
                });
            });
        }

        if (this._iFrame) {
            this._iFrame.src = mediaContentUrl;
        }

        // TODO: implement startSeconds and endSeconds
    }
    loadVideoByUrl(mediaContentUrl:string, params?:LoadVideoParams): void {
        this.cueVideoByUrl(mediaContentUrl, params);
    }


    handleEvent(event: MessageEvent) {
        if (event.data.sender == this._iFrame?.name) {
            if (event.data.event === 'paella:iFrame:auth') {
                if (this._onPaellaAuthRequired !== null) {
                    this._onPaellaAuthRequired();
                }
            }            
            if (this._onEvents) {
                this._onEvents(event.data.event, event.data.params);
            }
            this?.__eventListeners__ && this.__eventListeners__[event.data.event]?.forEach(cbData => cbData.callback(event.data.event, event.data.params));

            if (event.data.event === 'paella:iFrame:FunctionCall') {
                const responseId = event.data.params.responseId;
                if (responseId in this.__functionCallingListeners__) {
                    if (event.data.params.error) {
                        this.__functionCallingListeners__[responseId].reject(event.data.params.error);
                    }
                    else {
                        this.__functionCallingListeners__[responseId].resolve(event.data.params.response);
                    }
                    delete this.__functionCallingListeners__[responseId];
                }
            }
        }      
    }

    bindEvent(event: string, callback: OnEventCallback) {
	    this.__eventListeners__[event] = this.__eventListeners__[event] || [];
	    this.__eventListeners__[event].push({callback});
	    return this;
    }

    _triggerEvent(event:string, params:object) {
        this._iFrame?.contentWindow?.postMessage({event, params}, '*');
    }

    _functionCalling<T>(func:string, params = {}) : Promise<T>{
        const callId = this._functionCallingId || 0;
        this._functionCallingId = callId + 1;
        
        return new Promise((resolve, reject) => {
            this.__functionCallingListeners__[callId] = {resolve,reject};
            this._triggerEvent("paella:iFrame:FunctionCall", {
                func,
                params,
                resolveId: callId
            });
        });
    }

    version() {
        return this._functionCalling("version");
    }

    ready() {
        return this._functionCalling("ready");
    }

    state() {
        return this._functionCalling("state");
    }

    stateText() {
        // return PlayerStateNames[this.state];
    }
    
    videoId() {
        // return this._videoId;
    }

    metadata() {
        return this._functionCalling("metadata");
    }

    captions() {
        return this._functionCalling("captions");
    }

    // Playback functions
    play(): void {
        this._triggerEvent(Events.PLAY, {});
    }
    pause(): void {
        this._triggerEvent(Events.PAUSE, {});
    }
    stop(): void {
        this._triggerEvent(Events.STOP, {});
    }

    paused() {
        return this._functionCalling<boolean>("paused");
    }

    isFullScreenSupported() {
        return this._functionCalling<boolean>("isFullScreenSupported");
    }

    enterFullscreen(): void {
        this._functionCalling<void>("enterFullscreen");
    }
    exitFullscreen(): void {
        this._functionCalling<void>("exitFullscreen");
    }

    isFullscreen() {
        return this._functionCalling<boolean>("isFullscreen");
    }
    
    currentTime() {
        return this._functionCalling<number>("currentTime");        
    }

    setCurrentTime(t: number) {
        this._triggerEvent(Events.SEEK, { newTime: t });
    }
    
    volume() {
        return this._functionCalling<number>("volume");
    }
    
    setVolume(v: number) {    
        this._triggerEvent(Events.VOLUME_CHANGED, { volume: v });
    }
    
    duration() {
        return this._functionCalling<number>("duration");
    }

    playbackRate() {
        return this._functionCalling<number>("playbackRate");
    }

    setPlaybackRate(r: number) {
        this._triggerEvent(Events.PLAYBACK_RATE_CHANGED, { newPlaybackRate: r });
    }

    isTrimEnabled() {
        return this._functionCalling<boolean>("isTrimEnabled");
    }

    trimStart() {
        return this._functionCalling<number>("trimStart");
    }

    trimEnd() {
        return this._functionCalling<number>("trimEnd");
    }

    setTrimming({ enabled, start, end }: { enabled: boolean, start: number, end: number }) {
        this._triggerEvent(Events.TRIMMING_CHANGED, {enabled, start, end});
    }

    // Accessing and modifying DOM nodes
    /**
     * This method returns the DOM node for the embedded <iframe>
     */
    getIframe(): HTMLIFrameElement {
        return this._iFrame;
    }

}