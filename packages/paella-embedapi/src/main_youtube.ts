
import {Player as PaellaPlayer} from './Player';
import {YTPlayer as Player} from './YTPlayer';

declare global {
    interface Window {
        YT: object,
        onYouTubeIframeAPIReady?: () => void;
    }
}

window.YT = {
    PaellaPlayer,
    Player,
}


window.addEventListener("load", (event) => {
  if (window.onYouTubeIframeAPIReady !== undefined) {
    window.onYouTubeIframeAPIReady();
    }
});