var contentstack = require("./../../contentstack.js"), // replace it with 'contentstack-express' on your environment
    app = contentstack(),
    config = contentstack.config,
    server = config.get("server"),
    environment = config.get("environment"),
    port = process.env.PORT || config.get("port");
 
/**
* start the application
*/

app.listen(port, function() {
    console.log("Server(%s) is running on '%s' environment over %d port", server, environment, port);
});