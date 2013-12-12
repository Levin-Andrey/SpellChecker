var host = 'auramoscow.ru';
var url = 'http://auramoscow.ru/';
var Crawler = require("crawler").Crawler;
var spawn = require('child_process').spawn;

var links = [];
links.push(url);

var SpellChecker = function(callback) {
    this.onUpdate = callback;
    this.child = spawn('hunspell', ['-a', '-d', 'ru_RU']);
    var me = this;
    this.child.stdout.on('data', function (data) {
        var lines = data.toString().split('\n');
        for (var i in lines) {
            me.onUpdate(lines[i]);
        }
    });
    this.child.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    this.child.on('close', function (code) {
        console.log('child process exited with code ' + code);
    });
};

SpellChecker.prototype.checkWord = function(word) {
    this.child.stdin.write(word + '\n', 'utf8');
};

var spellChecker = new SpellChecker(function(data) {
    if (data.length == 0 || data[0] == '*') {
        return;
    }
    console.log('str:' + data);
});

var c = new Crawler({
    "maxConnections":10,
    "forceUTF8": true,
    "cache": true,
    "skipDubplicates": true,
    "callback": function(error, result, $) {
        if (error) {
            console.log(error);
            return;
        }
        if (!$) {
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
            if (word.length > 1 && words.indexOf(word) == -1) {
                words.push(word);
                spellChecker.checkWord(word);
            }
        }
        $("a").each(function(index,a) {
            if (a.href.indexOf(host) > -1 && links.indexOf(a.href) == -1) {
                links.push(a.href);
                c.queue(a.href);
            }
        });
    },
    "onDrain": function() {
        process.exit(1);
    }
});

c.queue(url);