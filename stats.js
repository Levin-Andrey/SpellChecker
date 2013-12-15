var db = require("mongojs").connect("spell", ["pages", "projects", "typos"]);

db.pages.count({}, function(err, number) {
    console.log('Total number of pages in DB:', number);
    db.pages.count({downloaded_at: {$exists: false}}, function (err, number) {
        console.log('To download: ', number);
        db.errors.count({}, function(err, numOfErrors) {
            console.log('Number of typos:', numOfErrors);
            process.exit(1);
        });
    });
});