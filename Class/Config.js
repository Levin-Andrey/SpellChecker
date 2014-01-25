var Config = {}

Config.email = {};
Config.project = {};
Config.spider = {};

Config.email.from = "noreply@spellchecker.com";
Config.email.to = "lennytmp@gmail.com";

Config.project.pages_limit = 1000;
Config.project.errors_limit = 10;

Config.spider.no_projects_timeout = 10;
Config.spider.unlock_page_timeout = 5*60000;
Config.spider.pool_size = 5;

module.exports = Config;
