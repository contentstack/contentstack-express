const _ = require("lodash"),
  fs = require("fs"),
  path = require("path"),
  config = require("../../config");

let cm_provider = null;

class ContentManagementProvider {
  constructor() {
    if (!cm_provider) {
      let cm_provider_name, cm_provider_path;
      // If custom provider for content is provider, load it, else use the generic proider of storage, else use filesystem
      cm_provider_name =
        config.get("storage.content.provider") ||
        config.get("storage.provider") ||
        "filesystem";
      cm_provider_path = path.join(__dirname, cm_provider_name.toLowerCase() + ".js");
      if (fs.existsSync(cm_provider_path))
        cm_provider = require(cm_provider_path);
      else
        throw new Error(
          `Unable to load content management provider at: ${cm_provider_path}`
        );
    }

    return cm_provider;
  }
}

module.exports = new ContentManagementProvider();
