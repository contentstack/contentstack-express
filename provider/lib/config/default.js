const config = {
  omit_keys: ["include_references", "include_count", "_remove"],
  languages: [],
  logs: {
    console: 'info',
    path: './_logs'
  },
  storage: {
    provider: "filesystem",
    del_keys: [],
    base_dir: './_content',
    contents: {
      // base_dir: "./_content",
      options: {}
    },
    assets: {
      keys_delete: ["_return_inserted_asset"],
      // base_dir: "./_content",
      pattern: "/assets/:uid/:filename",
      download: false,
      options: {}
    }
  },
  contentstack: {
    host: "https://api.contentstack.io",
    version: "v3",
    socket: "https://contentstack-realtime.built.io/",
    urls: {
      stacks: "/stacks/",
      content_types: "/content_types/",
      entries: "/entries/",
      assets: "/assets/",
      environments: "/environments/",
      publish_queue: "/publish-queue/",
      session: "/user-session/",
      user: "/user/"
    }
  }
};

module.exports = config;
