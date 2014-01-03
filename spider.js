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
            callback(window.jQuery, window);
        }
    });
};

var getAttr = function($, attr) {
    var result = [];
    $("["+ attr +"]").each(function() {
        var text = $(this).attr(attr);
        if (text) {
            result.push(text);
        }
    });
    return result;
};

var getWords = function($, window) {
    var text = "";
    $('script').remove();
    $('style').remove();
    $('noscript').remove();
    $('br').replaceWith(". ");
    //removing html comments
    $('*').contents().each(function() {
        if(this.nodeType == 8) {
            $(this).remove()
        }
    });
    text = $('body').text().replace(/\s{2,}/g, ' ');
    var otherTexts = getAttr($, 'title')
        .concat(getAttr($, 'alt'));
    $("[value][type!=hidden]").each(function() {
        var text = $(this).val();
        if (text) {
            otherTexts.push(text);
        }
    });
    otherTexts.push(window.document.title);
    otherTexts.push($('meta[name=keywords]').attr("content"));
    otherTexts.push($('meta[name=description]').attr("content"));
    otherTexts.push(text);
    otherTexts.join(" ");
    text = text.replace(/(ё)/g, "е")
        .replace(/(Ё)/g, "Е")
        .replace(/\b(https?:\/\/)?([\da-z.-]+).([a-z.]{2,6})([\/\w .-])\/?\b/g, " ")
        .replace(/\b(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))\b/g, " ")
        .replace(/[^a-zA-Zа-яА-Я]/g, " ")
        .replace(/[0-9]/g, " ");
    var wordsDirty = text.split(/\s+/);
    var words = [];
    for (var i in wordsDirty) {
        var word = wordsDirty[i];
        if (word.length > 2
            && word[0] !== word[0].toUpperCase()) {
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
            console.log('before insert url');
            db.pages.insert({
                project_id: page.project_id,
                url: url
            });
        });
    });
};

var analyzePage = function(page, callback) {
    fetchUrl(page.url, function($, window) {
        var words = getWords($, window);
        db.pages.update({_id: page._id}, {$set: {words: words, downloaded_at: new Date()}});
        findAndInsertUrls($, page);
        callback(page);
    });
};

var Pool = function(max) {
    this.max = max;
    this.inProgress = [];
};

Pool.prototype.finished = function(page, time) {
    console.log('finished', page.url, time, new Date().getTime());
    this.inProgress = this.inProgress.filter(function(element){
        return !page._id.equals(element._id);
    });
    this.loadPages();
};

Pool.prototype.launch = function(page) {
    console.log('::: Launching page ', page.url);
    this.inProgress.push(page);
    //analyzePage(page, this.finished);
    var me = this;
    setTimeout(function() {
        me.finished(page, new Date().getTime())
    }, 10000);
};

Pool.prototype.isInProgress = function(page) {
    var i = this.inProgress.length;
    while (i--) {
        if (page._id.equals(this.inProgress[i]._id)) {
            return true;
        }
    }
    return false;
};

Pool.prototype.loadPages = function() {
    var me = this;
    db.projects.find().sort({created: -1}, function(err, projects) {
        if (projects.length == 0) {
            console.log("No projects found");
            if (me.inProgress.length == 0) {
                setTimeout(me.loadPages(), 1);
            }
            return;
        }
        var i = projects.length;
        while (i--) { //first add at least one page per project
            var project = projects[i];
            if (me.inProgress.length == me.max) {
                return;
            }
            if (!project.started_at) {
                db.pages.insert({
                    project_id: project._id,
                    url: project.url
                }, function(err) {
                    if (err) throw err;
                    db.projects.update({_id: project._id}, {
                        $set: {started_at: new Date()}
                    }, function(err) {
                        if (err) throw err;
                        me.loadPages();
                    });
                });
                return;
            }
            db.pages.findOne({project_id: project._id, downloaded_at: {$exists: false}}, function(err, page) {
                if (!page || me.isInProgress(page)) {
                    return;
                }
                me.launch(page);
            });
        }
        me.loadPages();
    });
};

var p = new Pool(10);
p.loadPages();