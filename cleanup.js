var db = require("mongojs").connect("spell", ["pages", "projects", "errors"]);

db.projects.remove({}, function(){
    db.pages.remove({}, function() {
        db.errors.remove({}, function() {
            process.exit(1);
        });
    });
});

