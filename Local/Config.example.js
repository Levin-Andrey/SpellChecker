var Config = function () {
    this.isProd = false;
    this.isDebug = true;
};
var defaults = require("../Class/Config.js");
Config.prototype = defaults;

module.exports = new Config;
