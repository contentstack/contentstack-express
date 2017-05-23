module.exports = exports = {
    "port": 5000,
    "theme": "basic",
    "cache": true,
    "logs": {
        "console": true
    },
    view: {
        scaffold: true
    },
    "static": {
        "path": "public",
        "url": "/static"
    },
    "languages": [
        {
            "code": "en-us",
            "relative_url_prefix": "/"
        },
        {
            "code": "ja-jp",
            "relative_url_prefix": "/jp/"
        }
    ],
    "plugins": {
        "hitesh": {}
    },
    assets: {
        options: {
            maxAge: 15000
        }
    },
    indexes: {
        "reference": ["title"],
        "other_reference": ["title"]
    },
    "contentstack": {
        "api_key": "bltf9cdecd012ea43cc",
        "access_token": "blte6d3fe16e678f835096754b7"
    }

};
