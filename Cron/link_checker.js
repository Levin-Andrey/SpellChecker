var db = require("mongojs").connect("spell", ["pages", "projects", "errors", "links"]),
    request = require('request'),
    breakException = {},
    async = require("async"),
    Config = require('../Local/Config.js');

var markAsChecked = function(link, callback) {
    db.links.update({_id: link._id}, {$set : {checked_at: new Date()}}, function (err) {
        if (err) throw err;
        callback(null, false);
    });
}

var isHtml = function(url, callback) {
    request.head(url, function (error, response) {
        if (!error && response.statusCode == 200
            && response.headers["content-type"].indexOf('text/html') != -1) {
            callback(true);
        } else {
            callback(false);
        }
    });
};

var main = function() {
    if (Config.isDebug) {
        console.log("main!");
    }
    var processLink = function(link, callback) {
        if (Config.isDebug) {
            console.log("Processing link: " + link.url);
        }
        isHtml(link.url, function(isHtml) {
            if (!isHtml) {
                markAsChecked(link, callback);
                return;
            }
            db.pages.count({project_id: link.project_id}, function (err, count) {
                if (err) throw err;
                if (count >= Config.project.pages_limit) {
                    markAsChecked(link, callback);
                    return;
                }
                db.pages.insert({
                    project_id: link.project_id,
                    url: link.url
                }, function() {
                    markAsChecked(link, callback);
                });
            });
        });
    };
    db.links.find({checked_at: {$exists: false}}, function (err, found) {
        if (err) throw err;
        async.mapLimit(found, 25, processLink, function () {
            setTimeout(main, Config.link_checker.timeout);
        });
    });
}

main();

