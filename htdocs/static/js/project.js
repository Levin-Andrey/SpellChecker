var $tpl, $container, errors = [];
var serverUrl = "//" + document.domain + "/api/";

var addNewError = function(project_id) {
    if (errors.length < 10) {
        getErrors(project_id, function(){});
    }
    var error =  errors.shift();
    if (!error) {
        return;
    }
    var $el = $tpl.clone().removeClass("js-template");
    $el.find(".error-word").text(error.word);
    var pagesText = " page";
    if (error.pages_count > 1) {
        pagesText = " pages";
    }
    $el.find(".toggle-url-list").text(error.pages_count + pagesText);
    var variants = error.variants.join(", ");
    if (!variants) {
        variants = "No variants found =(";
    }
    $el.find(".variants").text(variants);
    var $urlList = $el.find(".urlList");
    error.pages.forEach(function(url) {
        var $a = $("<a></a>");
        $a.text(url);
        $a.attr("href", url);
        $a.attr("target", "_blank")
        $a.appendTo($urlList);
    });
    $el.find(".error_id").val(error._id);
    $el.appendTo($container);
};

var getErrors = function(project_id, callback) {
    $.ajax({url: serverUrl + 'projects/' + project_id + '/errors'}).done(function(data) {
        errors = data.errors;
        console.log(errors);
        callback();
    });
};

var renderStats = function(project_id) {
    updateProjectStats(project_id);
    $statsBlock = $(".project-stats.js-template");
    $statsBlock.appendTo($("#project-stats-container"));
    $statsBlock.removeClass("js-template");
};

var updateProjectStats = function(project_id) {
    $.ajax({url: serverUrl + 'projects/' + project_id + '/stats'}).done(function(data) {
        $("#typos_to_review").text(data.typos_to_review);
        $("#typos_ignored").text(data.typos_ignored);
        $("#pages_analyzed").text(data.pages_analyzed);
        $("#pages_left_to_download").text(data.pages_left_to_download);
        $("#pages_left_to_check").text(data.pages_left_to_check);
        if (data.pages_left_to_download > 0 || data.pages_left_to_check > 0) {
            setTimeout(updateProjectStats, 300);
        }
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
    prmarr = prmstr.split ("&");
    var params = {};
    for ( var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split("=");
        params[tmparr[0]] = tmparr[1];
    }
    return params;
};

var renderErrors = function(project_id) {
    $tpl = $(".js-template.ortho-error-row");
    $container = $('#errors-container');
    getErrors(project_id, function(){
        for (var i = 0; i < 5; i++) {
            addNewError();
        }
    });
    $(document).on('click', "a.toggle-url-list", function() {
        $(this).closest(".ortho-error").find(".urlList").slideToggle();
    });
    $(document).on('click', "a.ignore", function() {
        var $el = $(this).closest(".ortho-error");
        var id = $el.find(".error_id").val();
        $el.remove();
        $.ajax({url: serverUrl + 'errors/' + id + '/ignore'}).done(updateProjectStats);
        addNewError();
    });
    $(document).on('click', "a.fix", function() {
        var $el = $(this).closest(".ortho-error");
        var id = $el.find(".error_id").val();
        $el.remove();
        $.ajax({url: serverUrl + 'errors/' + id + '/fixed'}).done(updateProjectStats);
        addNewError();
    });
};
