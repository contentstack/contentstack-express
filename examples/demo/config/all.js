module.exports = exports = {
    port: 5000,
    cache: true,
    theme: "basic",
    languages: [
        {
            "code": "en-us",
            "relative_url_prefix": "/"
        },
        {
            "code": "ja-jp",
            "relative_url_prefix": "/jp/"
        }
    ],
    plugins: {
        demo:{}
    },
    contentstack: {
        "api_key": "api_key",
        "access_token": "access_token"
    }
};
