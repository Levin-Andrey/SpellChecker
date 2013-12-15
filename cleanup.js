var db = require("mongojs").connect("spell", ["pages", "projects", "typos"]);

db.pages.find().skip(1, function(err, elems) {
    elems.forEach(function(elem) {
       db.pages.remove({_id: elem._id});
    });
});

db.pages.find({}, function(error, pages) {
    pages.forEach(function(page) {
        delete page.downloaded_at;
        delete page.checked_at;
        db.pages.save(page);
    });
});

db.errors.remove();