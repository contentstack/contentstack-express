const _ = require("lodash"),
  fs = require("fs"),
  path = require("path"),
  config = require("../../config");

let am_provider = null;

class AssetManagementProvider {
  constructor() {
    if (!am_provider) {
      let am_provider_name, am_provider_path;
      // If custom provider for content is provider, load it, else use the generic proider of storage, else use filesystem
      am_provider_name =
        config.get("storage.asset.provider") ||
        config.get("storage.provider") ||
        "filesystem";
      am_provider_path = path.join(__dirname, am_provider_name.toLowerCase() + ".js");
      if (fs.existsSync(am_provider_path))
        am_provider = require(am_provider_path);
      else
        throw new Error(
          `Unable to load asset management provider at: ${am_provider_path}`
        );
    }

    return am_provider;
  }
}

module.exports = new AssetManagementProvider();
