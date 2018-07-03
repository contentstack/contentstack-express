module.exports = {
    contentstack: {
        api_key: "stack_api_key",
        access_token: "stack_access_token"
    },
    listener: {
        name: "websocket",
        config: {
            socket: "https://realtime.contentstack.io/"
        }
    },
    connector: {
        name: "filesystem",
        config: {
            base_dir: "./content"
        }
    }
}
