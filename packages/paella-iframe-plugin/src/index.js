import iFramePlugin from './plugins/es.upv.paella.iFramePlugin';

export default function getIFramePluginsContext() {
    return require.context("./plugins", true, /\.js/)
}

export const iFramePlugins = [
    {
        plugin: iFramePlugin,
        config: {
            enabled: true
        },
    }
];

export const allPlugins = iFramePlugins;

export const IFramePlugin = iFramePlugin;

