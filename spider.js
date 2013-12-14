var jsdom = require('jsdom'),
    db = require("mongojs").connect("spell", ["pages", "projects"]),
    fs = require("fs"),
    jquery = fs.readFileSync("./jquery-2.0.3.min.js", "utf-8");

var fetchUrl = function(url, callback) {
    console.error(':::::Parsing ' + url);
    jsdom.env({
        url: url,
        src: [jquery],
        done: function (err, window) {
            if (err) {
                console.log('Got error while fetching url', err);
                return;
            }
            callback(window.jQuery);
        }
    });
};

var getWords = function($) {
    if (!$) {
        console.log("Could not get jquery object");
        return [];
    }
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
    return words;
};

var findAndInsertUrls = function($, page) {
    var host = page.url.replace(/^\w+:\/\//, "").replace(/\/.*$/, "");
    $("a").each(function(index,a) {
        if (a.href.indexOf(host) == -1) {
            return;
        }
        var url = a.href.replace(/#.*$/, "");
        db.pages.insert({
            project_id: page.project_id,
            url: url
        });
    });
};



var main = function() {
    var a = new Date();
    a.setDate(a.getDate() - 2);
    db.pages.find(
        {
            $or: [
                {downloaded_at: {$exists: false}},
                {downloaded_at: {$lt: a}}
            ]
        },
        function(err, pages) {
            console.log('here');
            if( err || !pages) {
                console.log("No pages found");
                setTimeout(main, 10000);
            }
            else pages.forEach( function(page) {
                fetchUrl(page.url, function($) {
                    var words = getWords($);
                    db.pages.update({_id: page._id}, {$set: {words: words, downloaded_at: new Date()}});
                    findAndInsertUrls($, page);
                    setTimeout(main, 100);
                });
            });
        }
    );
};

setInterval(function() {
    db.projects.find({started_at: {$exists: false}}, function(error, projects){
        projects.forEach(function(project) {
            db.pages.insert({
                project_id: project._id,
                url: project.url
            });
            project.started_at = new Date();
            db.projects.save(project);
        });
    });
}, 100);

main();