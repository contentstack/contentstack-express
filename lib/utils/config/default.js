module.exports = exports = {
    port: 4000,
    cache: true,
    logs: {
        console: true,
        json: true,
        path: "./_logs"
    },
    view: {
        module: "nunjucks",
        extension: "html",
        scaffold: true,
        minify: false
    },
    languages: [
        {
            code: "en-us",
            relative_url_prefix: "/"
        }
    ],
    storage: {
        provider: "FileSystem",
        options: {
            basedir: "./_content"
        }
    },
    assets: {
        pattern: "/assets/:uid/:filename",
        basedir: "./_content",
        options: {
            dotfiles: 'ignore',
            etag: true,
            extensions: [ 'html', 'htm'],
            fallthrough: true,
            index: 'index.html',
            lastModified: true,
            maxAge: 0,
            redirect: true,
            setHeaders: function (res, path, stat) {
                res.set('x-timestamp', Date.now());
            }
        }
    },
    "static": {
        url: "/static",
        path: "public",
        options: {
            dotfiles: 'ignore',
            etag: true,
            extensions: [ 'html', 'htm'],
            fallthrough: true,
            index: 'index.html',
            lastModified: true,
            maxAge: 0,
            redirect: true,
            setHeaders: function (res, path, stat) {
                res.set('x-timestamp', Date.now());
            }
        }
    },
    contentstack: {
        host: "https://api.contentstack.io",
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
    }
}
