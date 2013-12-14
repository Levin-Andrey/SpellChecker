var spawn = require('child_process').spawn,
    db = require("mongojs").connect("spell", ["pages", "errors"]);;

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

var main = function() {
    db.pages.findOne({checked_at: {$exists: false}, words: {$exists: true}}, function(err, page) {
        if( err || !page) {
            console.log("No pages found");
            setTimeout(main, 10000);
            return;
        }
        console.log(page.url, 'need to check', page.words.length, 'words');
        var processWord = function(word) {
            spellChecker.checkWord(word, function(err, variants) {
                if (err) {
                    console.log("Inserting error");
                    db.errors.findAndModify({
                        query: {
                            project_id: page.project_id,
                            word: word,
                            variants: variants
                        },
                        update: {
                            $addToSet: {page_ids: page._id},
                            $inc: {pages_count: 1},
                            $setOnInsert: {created: new Date()}
                        },
                        upsert: true
                    })
                }
                if (!page.words.length) {
                    db.pages.update({_id: page._id}, {
                        $set: {checked_at: new Date()}
                    });
                    console.log('page done');
                    setTimeout(main, 100);
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