var db = require("mongojs").connect("spell", ["pages", "projects"]);

var a = new Date();
a.setDate(a.getDate() - 2);

db.pages.count(
    {
        $or: [
            {downloadedAt: {$exists: false}},
            {downloadedAt: {$lt: a}}
        ]
    },
    function(err, elems) {
        console.log(elems);
    }
);