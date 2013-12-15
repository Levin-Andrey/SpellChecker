var jsdom = require('jsdom'),
    db = require("mongojs").connect("spell", ["pages", "projects"]),
    fs = require("fs"),
    jquery = fs.readFileSync("./htdocs/static/js/jquery-2.0.3.min.js", "utf-8"),
    request = require('request');


var callIfHtml = function(url, callback) {
    request.head(url, function (error, response) {
        if (!error && response.statusCode == 200
            && response.headers["content-type"].indexOf('text/html') != -1) {
            callback();
        }
    });
};

var fetchUrl = function(url, callback) {
    console.error(':::::Parsing ' + url);
    jsdom.env({
        url: url,
        src: [jquery],
        done: function (err, window) {
            if (err) {
                console.log('Got error while fetching url', err);
                setTimeout(fetchUrl(url, callback), 1000);
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
        .replace(/(ё)/g, "е")
        .replace(/(Ё)/g, "Е")
        .replace(/[^a-zA-Zа-яА-Я]/g, " ")
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
        var url = a.href.replace(/#.*$/, "").replace(/\/\/www\./, "//");
        callIfHtml(url, function() {
            db.pages.insert({
                project_id: page.project_id,
                url: url
            });
        });
    });
};

var Counter = function(max) {
    this.max = max;
    this.processed = 0;
};

Counter.prototype.inc = function() {
    this.processed++;
    return this.max <= this.processed;
};

var main = function() {
    console.log('Getting 10 urls');
    var a = new Date();
    a.setDate(a.getDate() - 2);
    db.pages.find(
        {
            $or: [
                {downloaded_at: {$exists: false}},
                {downloaded_at: {$lt: a}}
            ]
        }).limit(10,
        function(err, pages) {
            if( err || !pages || pages.length == 0) {
                console.log("No pages found");
                setTimeout(main, 100000);
                return;
            }
            var counter = new Counter(pages.length);
            pages.forEach(function(page) {
                fetchUrl(page.url, function($) {
                    var words = getWords($);
                    db.pages.update({_id: page._id}, {$set: {words: words, downloaded_at: new Date()}});
                    findAndInsertUrls($, page);
                    if (counter.inc()) {
                        setTimeout(main, 100);
                    };
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
            }, function(err) {
                if (!err) {
                    db.projects.update({_id: project._id}, {
                        $set: {started_at: new Date()}
                    });
                }
            });
        });
    });
}, 100);

main();
