var async = require('async'),
    mongojs = require('mongojs'),
    db = mongojs.connect("spell", ["pages", "errors", "projects"]);

async.parallel([
        function(callback) {
            db.pages.count({downloaded_at: {$exists: true}}, callback);
        },
        function(callback) {
            db.pages.count({downloaded_at: {$exists: false}}, callback);
        }
    ],
    function(err, results){
        console.log(results);
    });