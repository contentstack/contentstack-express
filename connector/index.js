const _ = require("lodash");
const config = require("./lib/config");
const QueryBuilder = require("./lib/query-builder");
const DB = require("./lib/providers");

let providerInstance = null;
const Listener = require("./listener");
/**
 * Provider class is the entry point for the contentstack-provider module
 * By default, exports
 *   - db: Gives direct access to provider methods
 *   - query_builder: A wrapper object over the db object
 */
class Provider {
    constructor(parent, _config) {
        if (!provider_instance) {
            // if config is provided, override internal config with custom config
            if (typeof _config === "object" && !(_config instanceof Array)) {
                for (let key in _config) config.set(key, _config[key]);
            }
            // build logger object once the configs are set
            // logger.load();

            // const plugins = require("./lib/plugins");


            // attach plugins
            // plugins.load();
            // activate plugins in db
            // DB.loadPlugins();

            this.db = DB;
            this.query_builder = QueryBuilder;

            // Activate listener class, only if the parent object has been provided
            if (typeof parent === "object" && Object.keys(parent).length) {
                // TODO: iterate over the prototype chain
                // Check if the object's prototype chain extends EventEmitter
                if (Object.getPrototypeOf(parent.constructor).name === "EventEmitter") {
                    this.listener = new Listener(parent);

                } else {
                    config.logger.listener.error(new Error(`Parent instance provided via 'contentstack-provider' constructor does not extend 'EventEmitter' instance.`));
                }
            }
            provider_instance = this;
        }
        return provider_instance;
    }

    getConfig(key) {
        try {
            return config.get(key);
        } catch (error) {
            config.logger.provider.error(error);
            return false;
        }
    }

    setConfig(_config) {
        try {
            if (typeof _config === "object" && !(_config instanceof Array)) {
                for (let key in _config) config.set(key, _config[key]);
            }
            return true;
        } catch (error) {
            config.logger.provider.error(error);
            return false;
        }
    }

    setListner(parent) {
        try {
            if (typeof parent === "object") {
                Listener = require("./listener");
                this.listener = new Listener(parent);
            }
            return true;
        } catch (error) {
            config.logger.provider.error(error);
            return false;
        }
    }

    removeListner(parent) {
        try {
            // If the constructor names match, they're prolly the same thing.
            if (parent.constructor.name === this.listener.constructor.name) {
                // Make listener object point to null
                this.listener.remvoveListener();
                // Delete current listener object
                delete this.listener;
            }
            // Return status of the operation
            return true;
        } catch (error) {
            config.logger.provider.error(error);
            return false;
        }
    }

    getProviderInstance() {
        return providerInstance;
    }
}

module.exports = Provider;