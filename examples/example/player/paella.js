import { Paella, defaultLoadVideoManifestFunction } from 'paella-core';
import { allPlugins as basicPlugins } from 'paella-basic-plugins';
import { allPlugins as slidePlugins } from 'paella-slide-plugins';
import { allPlugins as zoomPlugins } from 'paella-zoom-plugin';
import { allPlugins as userTrackingPlugins } from 'paella-user-tracking';
import { allPlugins as webglPlugins } from 'paella-webgl-plugins';
import { allPlugins as iFramePlugins } from 'paella-iframe-plugin';


window.onload = async () => {
    const initParams = {
        plugins: [
            ...basicPlugins,
            ...slidePlugins,
            ...zoomPlugins,
            ...userTrackingPlugins,
            ...webglPlugins,
            ...iFramePlugins
        ],


        loadVideoManifest: async function (url, config, player) {
            // In this demo page there is no authentication, so we need to simulate it.
            // When we try to load a video with the url "/test-auth-videoId/data.json" we will simulate the authentication process.
            if ( url.search("/test-auth-videoId/data.json") > 0) {
                const iFramePlugin = player.getPlugin("es.upv.paella.iFramePlugin")?.eventLog;
                if (iFramePlugin?.isEnabled()) {
                    // Require authentication from the parent iFrame.
                    await iFramePlugin?.sendAuthenticationRequestToParent({showLoader:true, stopExecution:true});
                }
            }
            
            return await defaultLoadVideoManifestFunction(url, config, player)
        }
    };
    
    try {
        const paella = new Paella('player-container', initParams);
        // apply Opencast theme
        await paella.skin.loadSkin('skins/opencast/theme.json');
        // load Paella
        await paella.loadManifest()        
    }
    catch (e) {
        console.error(e);
    }

}    