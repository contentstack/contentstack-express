var contentstack = require('contentstack-express')
var Router = contentstack.Router()

module.exports = exports = Router

Router.get("/:user_id/get", function (req, res, next) {
    console.error("Hitesh Header", req.host)
    console.error("Hitesh Header", req.hostname)
    console.error("Hitesh Header", req.get('host'))
    res.json(req.params)
})