var serverUrl = "//" + document.domain + "/api/";

var renderTypo = function(typo, $tpl, $container) {
    var $el = $tpl.clone().removeClass("js-template");
    $el.find(".error-word").text(typo.word);
    var pagesText = " page";
    if (typo.pages_count > 1) {
        pagesText = " pages";
    }
    $el.find(".toggle-url-list").text(typo.pages_count + pagesText);
    var variants = typo.variants.join(", ");
    if (!variants) {
        variants = "No variants found =(";
    }
    $el.find(".variants").text(variants);
    var $urlList = $el.find(".urlList");
    typo.pages.forEach(function(url) {
        var $a = $("<a></a>");
        $a.text(url);
        $a.attr("href", url);
        $a.attr("target", "_blank");
        $a.appendTo($urlList);
    });
    $el.find(".error_id").val(typo._id);
    $el.appendTo($container);
};

var loadTypos = function(project_id, callback) {
    $.ajax({url: serverUrl + 'projects/' + project_id + '/typos'}).done(function(data) {
        callback(data.typos);
    });
};

var updateProjectStats = function(project_id) {
    $.ajax({url: serverUrl + 'projects/' + project_id + '/stats'}).done(function(data) {
        if (data.error != "ok") {
            throw data.error;
            return;
        }
        data = data.stats;
        $("#typos_to_review").text(data.typos_to_review);
        $("#typos_ignored").text(data.typos_ignored);
        $("#pages_analyzed").text(data.pages_analyzed);
        $("#pages_left_to_download").text(data.pages_left_to_download);
        $("#pages_left_to_check").text(data.pages_left_to_check);
    });
};

var isUrl = function(url) {
    var regexp = /^(http(?:s)?\:\/\/[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,6}(?:\/?|(?:\/[\w\-]+)*)(?:\/?|\/\w+\.[a-zA-Z]{2,4}(?:\?[\w]+\=[\w\-]+)?)?(?:\&[\w]+\=[\w\-]+)*)$/;
    return regexp.test(url);
};

var getProjectId = function(callback) {
    var $_GET = getGetParams();
    var url = $_GET['url'];
    if (!url || !isUrl(url)) {
        window.location = "/";
        return;
    }
    $.ajax({
        url: serverUrl + 'projects/',
        type: "POST",
        data: {url: url}
    }).done(function(data) {
        if (data.error == "ok") {
            callback(data.project_id)
        } else {
            window.location = "/";
        }
    });
};

var getGetParams = function() {
    var prmstr = window.location.search.substr(1);
    prmarr = prmstr.split("&");
    var params = {};
    for ( var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split("=");
        params[tmparr[0]] = decodeURIComponent(tmparr[1]);
    }
    return params;
};
