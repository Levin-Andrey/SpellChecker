var jsdom = require('jsdom'),
    fs = require("fs"),
    jquery = fs.readFileSync("./htdocs/static/js/jquery-2.0.3.min.js", "utf-8");

jsdom.env({
    url: 'http://auramoscow.ru/map.html',
    src: [jquery],
    done: function (err, window) {
        if (err) {
            console.log('Got error while fetching url', err);
            setTimeout(fetchUrl(url, callback), 1000);
            return;
        }
        getText(window.jQuery, window);
    }
});

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


var getText = function($, window) {
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
    text = $('body').text().replace(/\s{2,}/g, '. ');
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
    otherTexts.join(". ");
    console.log(text);
};