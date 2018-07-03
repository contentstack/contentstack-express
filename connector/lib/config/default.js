const config = {
    languages: [],
    logs: {
        console: 'info',
        path: './_logs'
    },
    connector: {
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
};

module.exports = config;