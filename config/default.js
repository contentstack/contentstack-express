module.exports = {
    contentstack: {
        api_key: "blt0a3f321885435767",
        access_token: "bltf052afa18060994d"
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