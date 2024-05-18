# Paella Player iframe plugin

It contains iframe plugin for controling a embebed player.

## Usage

**Step 1:** Import the plugin context and add it to the Paella Player initialization parameters:

Usin plugin context API:

```javascript
...
import getIFramePluginsContext from 'paella-iframe-plugins';

let paella = new Paella('player-container', {
    customPluginContext: [
        getIFramePluginsContext()
    ]
});
...
```

Using explicit plugin import API:

```javascript
...
import {
    allPlugins as iFramePlugins, // All plugins
    IFramePlugin      // Independent plugin
} from 'paella-iframe-plugin';

let paella = new Paella('player-container', {
    plugins: [
        ...iFramePlugins,    // All plugins
        { // One plugin
            plugin: IFramePlugin,
            config: {
                enabled: true
            }
        }
    ]
});
...
```

**Step 2:** Configure the plugins you want to use in the paella player configuration.

```json
{
    "plugins": {
        ...
        "es.upv.paella.iFramePlugin": {
            "enabled": true,
            ...
        }
        ... other plugin settings
    }
}
```
