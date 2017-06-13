module.exports = exports = {
    port: 4000,
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
        "api_key": "stack_api_key",
        "access_token": "stack_access_token"
    }
};
