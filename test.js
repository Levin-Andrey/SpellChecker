var databaseUrl = "spell"; // "username:password@example.com/mydb"
var collections = ["pages"];
var db = require("mongojs").connect(databaseUrl, collections);

db.pages.find({}, function(err, pages) {
    if( err || !pages) console.log("No pages found");
    else pages.forEach( function(page) {
        console.log(page);
    });
});