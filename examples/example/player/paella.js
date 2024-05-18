import { Paella, utils } from 'paella-core';
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
        ]
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