var Config = function () {
    this.isProd = true;
};
var defaults = require("../Class/Config.js");
Config.prototype = defaults;

module.exports = new Config;
