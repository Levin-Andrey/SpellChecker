var db = require("mongojs").connect("spell", ["test"]);

db.test.findAndModify({
    query: {project_id: 123, word: 'mama'},
    update: {$addToSet: {page_ids: 4}},
    upsert: true
}, function() {
    db.test.find({}, function(err, test) {
        console.log(test);
    });
});
