var Config = function () {
    this.isProd = false;
};
var defaults = require("../Class/Config.js");
Config.prototype = defaults;

module.exports = new Config;
