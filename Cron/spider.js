var jsdom = require('jsdom'),
    db = require("mongojs").connect("spell", ["pages", "projects"]),
    fs = require("fs"),
    jquery = fs.readFileSync("./htdocs/static/js/jquery-2.0.3.min.js", "utf-8"),
    request = require('request'),
    breakException = {},
    async = require("async"),
    Config = require('../Local/Config.js'),
    myName = require("mongojs").ObjectId();



var isHtml = function(url, callback) {
    request.head(url, function (error, response) {
        if (!error && response.statusCode == 200
            && response.headers["content-type"].indexOf('text/html') != -1) {
            callback(true);
        } else {
            callback(false);
        }
    });
};

var fetchUrl = function(url, callback) {
    console.error('::: Fetching ' + url);
    jsdom.env({
        url: url,
        src: [jquery],
        done: function (err, window) {
            if (err) {
                console.log('Got error while fetching url', err);
                setTimeout(function () {
                    fetchUrl(url, callback)
                }, 1000);
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
    var blockTags = [ //if you add table - with append will be error nodeName is null
        'address', 'blockquote', 'div', 'dl', 'fieldset', 'form',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'noscript', 'ol',
        'p', 'pre', 'ul', 'td', 'tr', 'li', 'th', 'thead', 'button'
    ];
    $('*').contents().each(function() {
        if(this.nodeType == 8) { //removing html comments
            $(this).remove();
            return;
        }
        if (this.tagName && blockTags.indexOf(this.tagName.toLowerCase()) > -1) {
            $(this).append(' ');
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

var findAndInsertUrls = function($, page, freeSlotsForPages, callback) {
    var host = page.url.replace(/^\w+:\/\//, "").replace(/\/.*$/, "");
    var processLink = function($a, callback) {
        if (freeSlotsForPages <= 0 || $a.href.indexOf(host) == -1) {
            callback(null, false);
            return;
        }
        var url = $a.href.replace(/#.*$/, "").replace(/\/\/www\./, "//");
        isHtml(url, function(isHtml) {
            if (!isHtml) {
                callback(null, false);
                return;
            }
            freeSlotsForPages--;
            db.pages.insert({
                project_id: page.project_id,
                url: url
            }, function() {
                callback(null, true);
            });
        });
    };
    async.mapSeries($.makeArray($("a")), processLink, function() {
        callback();
    });
};

var analyzePage = function(page, callback) {
    db.pages.count({project_id: page.project_id}, function(err, num) {
        if (err) throw err;
        fetchUrl(page.url, function($, window) {
            console.log("::: Got text", page.url);
            try {
                var words = getWords($, window);
            } catch (e) {
                console.log(e);
                console.log('!!!! html markup is broken');
                words = [];
            }
            var freeSlotsForPages = Config.project.pages_limit - num;
            if (freeSlotsForPages > 0) {
                findAndInsertUrls($, page, freeSlotsForPages, function() {
                    callback(page, words);
                });
            } else {
                callback(page, words);
            }
        });
    });
};

var Pool = function(size) {
    this.size = size;
    this.allocated = 0;
    this.inProgress = [];
};

Pool.prototype.getFreeSpace = function() {
    return this.size - (this.inProgress.length + this.allocated);
}

Pool.prototype.finished = function(page, words) {
    console.log('trying to finish', page.url);
    var me = this;
    db.pages.update({
        _id: page._id,
        processing_by: myName
    }, {
       $unset: {processing_by: 1, processing_started_at: 1},
       $set: {words: words, downloaded_at: new Date()}
    }, function (err) {
        if (err) {
            throw err;
        }
        me.inProgress = me.inProgress.filter(function(element){
            return !page._id.equals(element._id);
        });
        console.log('finished', page.url);
        me.addPages();
    });
};

Pool.prototype.launch = function(page) {
    var me = this;
    console.log('::: Adding page to pool:', page.url);
    this.allocated -= 1;
    this.inProgress.push(page);
    analyzePage(page, function(page, words) {
        me.finished(page, words);
    });
};

Pool.prototype.addPage = function(project) {
    if (!this.checkFreeSpace()) return;
    this.allocated += 1;
    var me = this;
    var date = new Date(new Date() - 60000);
    var query = {
        query: {
            project_id: project._id,
            downloaded_at: {$exists: false},
            $or: [
                {processing_started_at: {$lt: date}},
                {processing_started_at: {$exists: false}}
            ],
            processing_by: {$ne: myName}
        },
        update: {$set: {processing_by: myName, processing_started_at: new Date()}}
    };
    db.pages.findAndModify(query, function(err, page) {
        if (err) throw err;
        if (!page) {
            if (!Config.isProd) {
                console.log('could not get url for', project.url);
            }
            me.allocated -= 1;
            return;
        }
        if (project.processing_by != myName) {
            console.log("Unlocked page");
        }
        me.launch(page);
    });
}

Pool.prototype.checkFreeSpace = function () {
    if (this.getFreeSpace() < 1) {
        console.log('pool size exceeded');
        return false;
    }
    return true;
}

Pool.prototype.addPages = function() {
    var me = this;
    if (!me.checkFreeSpace()) return;
    db.projects.find().sort({created: -1}, function(err, projects) {
        if (!me.checkFreeSpace()) return;
        if (projects.length == 0) {
            if (!Config.isProd) {
                console.log("No projects found");
            }
            if (me.inProgress.length == 0) {
                setTimeout(function() {
                    me.addPages();
                }, 1);
            }
            return;
        }
        try {
            projects.forEach(function(project) { // it's while not found
                if (!project.started_at) {
                    console.log('adding front page for project');
                    db.pages.insert({
                        project_id: project._id,
                        url: project.url
                    }, function() {
                        db.projects.update({_id: project._id}, {
                            $set: {started_at: new Date()}
                        }, function(err) {
                            if (err) throw err;
                            me.addPage(project);
                        });
                    });
                } else {
                    var date = new Date(new Date() - 60000);
                    db.pages.count({
                        project_id: project._id,
                        $or: [
                            {downloaded_at: {$exists: 1}},
                            {processing_started_at: {$gt: date}}
                        ],
                        processing_by: {$ne: myName}
                    }, function(err, num) {
                        if (err) throw err;
                        if (num >= Config.project.pages_limit) {
                            if (!Config.isProd) {
                                console.log("Project " + project.url + " has " + num + " analyzed pages. Skipping...");
                            }
                            return;
                        }
                        me.addPage(project);
                    });
                }
            });
            setTimeout(function () {
                me.addPages();
            }, 30);
        } catch (e) {
            if (e == breakException) {
                return;
            }
            throw e;
        }
    });
};

var p = new Pool(5);
console.log('Starting spider process', myName);
p.addPages();

