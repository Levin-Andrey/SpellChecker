var db = require("mongojs").connect("spell", ["pages", "projects", "errors"]);

db.pages.count({}, function(err, number) {
    console.log('Total number of pages in DB:', number);
    db.pages.count({downloaded_at: {$exists: false}}, function (err, number) {
        console.log('To download: ', number);
        db.errors.count({}, function(err, numOfErrors) {
            console.log('Number of typos:', numOfErrors);
            db.pages.count({processing_by: {$exists: 1}}, function (err, pr) {
                console.log('Number of pages in processing:', pr);
                process.exit(1);
            });
        });
    });
});
