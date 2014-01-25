var db = require("mongojs").connect("spell", ["pages", "projects", "errors", "links"]);

db.projects.remove({}, function(){
    db.pages.remove({}, function() {
        db.errors.remove({}, function() {
            db.links.remove({}, function() {
                process.exit(0);
            });
        });
    });
});

