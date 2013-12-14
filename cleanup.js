var db = require("mongojs").connect("spell", ["pages", "projects"]);

db.pages.find().skip(1, function(err, elems) {
    elems.forEach(function(elem) {
       db.pages.remove({_id: elem._id});
    });
    process.exit(1);
});