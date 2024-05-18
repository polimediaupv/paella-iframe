import { PluginModule } from "paella-core";
import packageData from "../../package.json";

let g_pluginModule = null;

export default class IFramePlugins extends PluginModule {
    static Get() {
        if (!g_pluginModule) {
            g_pluginModule = new IFramePlugins();
        }
        return g_pluginModule;
    }

    get moduleName() {
        return "paella-iframe-plugin";
    }

    get moduleVersion() {
        return packageData.version;
    }
}