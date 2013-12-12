var host = 'auramoscow.ru';
var url = 'http://auramoscow.ru/';
var request = require('request');
var parseString = require('xml2js').parseString;
var yandexApiUrl = 'http://speller.yandex.net/services/spellservice/checkText';
var Crawler = require("crawler").Crawler;
var links = [];
links.push(url);

var checkText = function(text, url) {
    request.post(
        {
            uri: yandexApiUrl,
            form: {
                text: text
            }
        },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                printErrors(body, url);
            }
        }
    );
};

var checkTextLocally = function(text, url) {

};

var printErrors = function(xml, url) {
    parseString(xml, function(err, result) {
        console.log(url);
        if (!result.SpellResult.error) {
            console.log('zero errors found');
            return;
        }
        var errors = result.SpellResult.error;
        for (var i in errors) {
            var word = errors[i].word[0];
            var variants = errors[i].s;
            if (!variants || variants.length == 0) {
                continue;
            }
            console.log('error:', word);
            console.log('variants:', variants);
        }
        console.log("\n\n");
    });
};

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
        var text = $('body').html().replace(/(<([^>]+)>)/ig, ' ').replace(/&.*?;/g, " ");
        console.log(text);
        process.exit(1);
        /*try {
         checkText(text, this.uri);
         } catch (e) {
         console.log(e);
         }*/
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