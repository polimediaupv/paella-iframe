import { Events, EventLogPlugin, bindEvent } from 'paella-core';
import IFramePlugins from './IFramePlugins';

const getPaellaEvents = (events) => events?.map(eventName => Events[eventName]);

export default class IFrameApiPlugin extends EventLogPlugin {
  getPluginModuleInstance() {
    return IFramePlugins.Get();
  }

  get name() {
    return super.name || "es.upv.paella.iFramePlugin";
  }

  isEnabled() {
    let enabled = false;    
    const isEmbedded = (window.self !== window.top);
    const iFrameNamePrefix = this.config?.iFrameNamePrefix;

    if (super.isEnabled() && isEmbedded) {    
      // This iFrame prefix is used by the iFrameEmbedApi
      // When constructing the embedded player iFrame
      if (iFrameNamePrefix) {
        enabled = (window.name && window.name.startsWith(iFrameNamePrefix));
      }
      else {
        enabled = true;
      }
    }

    return enabled;
  }

  get events() {
    const evs = getPaellaEvents(this.config.events) ?? Object.values(Events)
    return evs;
  }

  async onEvent(event, params) {
    if ((event == Events.SHOW_POPUP) || (event == Events.HIDE_POPUP)) {
      delete params.popUp;
    }

    // pass the event to the iframe parent
    this._postMessage(event, params);
  }

  async load() {
    if (window.parent !== window) {
      window.addEventListener('message', this, false);
    }
  }

  async unload() {    
    if (window.parent !== window) {
      window.removeEventListener('message', this, false);
    }
  }

  sendAuthenticationRequestToParent() {
    this.onEvent("paella:iFrame:auth", {});
  }

  async handleEvent(event) {
    const eventName = event?.data?.event;
    if (!eventName?.startsWith('paella:')) {
      return;
    }
    // Handle paella Events
    // console.log('IFrameApiPlugin: handleEvent', event);
    if (eventName === Events.PLAY) {
      this.player.play();
    }
    else if (eventName === Events.PAUSE) {
      this.player.pause();
    }
    else if (eventName === Events.STOP) {
      this.player.stop();
    }
    else if (eventName === Events.SEEK) {
      if (this.player?.ready) {
        this.player._videoContainer.setCurrentTime(event.data.params.newTime)
      }
      // else send error to host?
    }
    else if (eventName === Events.VOLUME_CHANGED) {
      this.player._videoContainer.setVolume(event.data.params.volume);
    }
    else if (eventName === Events.PLAYBACK_RATE_CHANGED) {
      this.player._videoContainer.setPlaybackRate(event.data.params.newPlaybackRate);
    }
    else if (eventName === Events.TRIMMING_CHANGED) {
      this.player._videoContainer.setTrimming(event.data.params);
    }
    
    else if (eventName == 'paella:iFrame:FunctionCall') {
      this.handleFunctionCalling(event.data.params);
    }
    else {
      this.player.log.info(`IFrameApiPlugin: Event ${eventName} not handled: ${JSON.stringify(event.data)}`, 'IFrameApiPlugin');
    }
  }


  async handleFunctionCalling({func, params, resolveId}) {
    this.player.log.info(`IFrameApiPlugin: handleFunctionCalling ${func}(${JSON.stringify(params)})`, 'IFrameApiPlugin');
    let response;
    let error;

    try {
      if (func === 'version') {
        response = this.player.version;
      }
      else if (func === 'ready') {
        response = this.player.ready;
      }
      else if (func === 'state') {
        response = this.player.state;
      }
      else if (func === 'metadata') {
        response = this.player.metadata;
      }
      else if (func === 'captions') {
        response = this.player.captions;
      }
      else if (func === 'paused') {
        response = await this.player.paused();
      }
      // fullscreen functions
      else if (func === 'isFullScreenSupported') {
        response = await this.player.isFullScreenSupported();
      }
      else if (func === 'enterFullscreen') {
        response = await this.player.enterFullscreen();
      }
      else if (func === 'exitFullscreen') {
        response = await this.player.exitFullscreen();
      }
      else if (func === 'isFullscreen') {
        response = await this.player.isFullscreen();
      }
      else if (func === 'currentTime') {
        response = await this.player.videoContainer.currentTime();
      }
      else if (func === 'volume') {
        response = await this.player.videoContainer.volume();
      }
      else if (func === 'duration') {
        response = await this.player.videoContainer.duration();
      }
      else if (func === 'playbackRate') {
        response = await this.player.videoContainer.playbackRate();
      }
      else if (func === 'isTrimEnabled') {
        response = this.player.videoContainer.isTrimEnabled;
      }
      else if (func === 'trimStart') {
        response = this.player.videoContainer.trimStart;
      }
      else if (func === 'trimEnd') {
        response = this.player.videoContainer.trimEnd;
      }
    }
    catch(e) {
      error = e;
    }

    // Send response to the embedAPI
    const responseParams = {
      responseId: resolveId,
      func,
      response,
      error
    };
    this._postMessage('paella:iFrame:FunctionCall', responseParams);
  }

  _postMessage(event, params) {
    try {
      const newMessage = {
        sender: window.name,
        event,
        params
      };
  
      window.parent.postMessage(newMessage, '*');    
    }
    catch(e) {
      this.player.log.debug(e.stack, 'IFrameApiPlugin');
    }    
  }
}