module.exports = {
    contentstack: {
        host: "https://api.contentstack.io",
        version: "v3",
        urls: {
            stacks: "/stacks/",
            content_types: "/content_types/",
            entries: "/entries/",
            assets: "/assets/",
            environments: "/environments/",
            publish_queue: "/publish-queue/",
            session: "/user-session/",
            user: "/user/",
            locales: "/locales/"
        },
        events: {
            delete: "delete",
            publish: "publish",
            unpublish: "unpublish"
        },
        types: {
            asset: "asset",
            entry: "entry",
            form: "form"
        }
    },
    listener: {
        name: "websocket",
        config: {
            socket: "https://realtime.contentstack.io/"
        }
    },
    logs: {
        console: true,
        json: true,
        path: "./_logs"
    },
    connector: {
        name: "filesystem",
        config: {
            base_dir: "./content"
        }
    }
}