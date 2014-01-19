var spawn = require('child_process').spawn,
    db = require("mongojs").connect("spell", ["pages", "errors"]),
    lev = require("../Class/Levenshtein.js"),
    wiki_url = 'http://ru.wikipedia.org/w/api.php?action=query&list=search&format=json&srsearch=',
    request = require('request'),
    Config = require('../Local/Config.js');

var SpellChecker = function() {
    this.wordsInProgress = [];
    this.firstLineSkipped = false;
    this.process = spawn('hunspell', ['-a', '-d', 'ru_RU,en_US']);
    var me = this;
    this.process.stdout.on('data', function (data) {
        var lines = data.toString().split('\n');
        var wordData;
        lines.forEach(function(line) {
            if (line.length == 0) {
                return;
            }
            if (line[0] == '*') {
                wordData = me.wordsInProgress.shift();
                wordData.callback(false);
                return;
            }
            if (me.firstLineSkipped) {
                wordData = me.wordsInProgress.shift();
                var variants = me.parseHunspellOutput(line);
                wordData.callback(true, variants);
            } else {
                me.firstLineSkipped = true;
            }
        });
    });
    this.process.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    this.process.on('close', function (code) {
        console.log('child process exited with code ' + code);
    });
};

SpellChecker.prototype.checkWord = function(word, callback) {
    this.wordsInProgress.push({
        word: word,
        callback: callback
    });
    this.process.stdin.write(word + '\n', 'utf8');
};

SpellChecker.prototype.parseVariants = function(str) {
    if (str == '') {
        result = [];
        return result;
    }
    var arr = str.split(', ');
    var result = [];
    for (var i in arr) {
        if (arr[i].length > 0) {
            result.push(arr[i]);
        }
    }
    return result;
};

SpellChecker.prototype.parseHunspellOutput = function(str) {
    var arr = str.split(': ');
    var variants = '';
    if (arr.length > 1) { //has any variants
        variants = arr[1];
    }
    return this.parseVariants(variants);
};

var getSimilarVariants = function(word, variants, distance) {
    var result = [];
    variants.forEach(function(variant) {
        if (lev.getEditDistance(word, variant) <= distance) {
            result.push(variant);
        }
    });
    return result;
};

var wikiFilter = function(word, callback) {
    request.get({
        url: wiki_url + word,
        headers: {
            'User-Agent': 'SpellChecker0.001 (http://spell.lenny.dev.vbo.name/; vbo@vbo.name) Based on request'
        },
        json: true
    }, function(err, resp, body) {
        if (err || !body.query) {
            throw ({text: "Error while fetching wiki", err: err, resp: resp, body: body});
        }
        if (body.query.searchinfo && body.query.searchinfo.suggestion) {
            callback(word, true);
        } else {
            callback(word, false);
        }
    });
};

var saveErrorToDb = function(page_id, project_id, word, variants) {
    console.log("Inserting typo");
    db.errors.findAndModify({
        query: {
            project_id: project_id,
            word: word,
            variants: variants
        },
        update: {
            $addToSet: {page_ids: page_id},
            $setOnInsert: {created: new Date()}
        },
        upsert: true,
        new: 1
    }, function (err, result) {
        // recalc pages_count after update
        var pages_count = result.page_ids.length;
        if (pages_count != result.pages_count) {
            db.errors.update({
                _id: result._id
            }, {
                $set: {
                    pages_count: pages_count
                }
            }, function (err) {
                if (err) throw err;
            });
        }
    });
};

var main = function() {
    db.pages.findOne({checked_at: {$exists: false}, words: {$exists: true}}, function(err, page) {
        if( err || !page) {
            if (!Config.isProd) {
                console.log("No pages found");
            }
            setTimeout(main, 1);
            return;
        }
        console.log(page.url, 'need to check', page.words.length, 'words');
        var processWord = function(word) {
            spellChecker.checkWord(word, function(err, variants) {
                if (err) {
                    variants = getSimilarVariants(word, variants, 1);
                    if (variants.length > 0) {
                        wikiFilter(word, function(word, isError) {
                            if (!isError) {
                                return;
                            }
                            saveErrorToDb(page._id, page.project_id, word, variants);
                        });
                    }
                }
                if (!page.words.length) {
                    db.pages.update({_id: page._id}, {
                        $set: {checked_at: new Date()}
                    });
                    console.log('page done');
                    setTimeout(main, 1);
                } else {
                    processWord(page.words.shift());
                }
            });
        };
        processWord(page.words.shift());
    });
};

var spellChecker = new SpellChecker();
main();
