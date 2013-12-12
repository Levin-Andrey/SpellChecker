var Crawler = require("crawler").Crawler;
var databaseUrl = "spell";
var collections = ["pages", "projects"];
var db = require("mongojs").connect(databaseUrl, collections);

var host = '', id = 0;

var c = new Crawler({
    "maxConnections":10,
    "forceUTF8": true,
    "cache": true,
    "skipDubplicates": true,
    "callback": function(error, result, $) {
        if (error || !$) {
            console.log(error);
            return;
        }
        console.error(':::::Parsing ' + this.uri);
        $('script').remove();
        $('style').remove();
        var text = $('body').html()
            .replace(/(<([^>]+)>)/ig, ' ')
            .replace(/&.*?;/g, " ")
            .replace(/[,.:;()\\//]/g, " ")
            .replace(/[0-9]/g, " ");
        var wordsDirty = text.split(/\s+/);
        var words = [];
        for (var i in wordsDirty) {
            var word = wordsDirty[i];
            if (word.length > 1) {
                words.push(word);
            }
        }
        var me = this;
        $("a").each(function(index,a) {
            if (a.href.indexOf(host) == -1) {
                return;
            }
            db.pages.findOne({url: a.href}, function(err, page) {
                if (!page) {
                    db.pages.insert({
                        project_id: id,
                        url: a.href
                    });
                    console.log('data inserted');
                    //c.queue(page.url);
                } else {
                    console.log(page);
                }
            });
        });
    },
    "onDrain": function() {
        console.log('drain');
        //process.exit(1);
    }
});


db.projects.findOne({}, function(err, project) {
    host = project.host;
    id = project._id;
    db.pages.find({project_id: id}, function(err, pages) {
        if( err || !pages) console.log("No pages found");
        else pages.forEach( function(page) {
            c.queue(page.url);
        });
    });
});

