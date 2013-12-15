var $tpl, $container, errors;
var serverUrl = "//" + document.domain + "/api/";

var createNewElement = function() {
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

var createStatsBlock = function() {
    updateProjectStats();
    $statsBlock = $("div.statistics.js-template");
    $statsBlock.appendTo($container.find(".row:not(.js-template)").first());
    $statsBlock.removeClass("js-template");
};

var updateProjectStats = function() {
    var id = '52aa34e9be41e08096c046d0';
    $.ajax({url: serverUrl + 'projects/' + id + '/stats'}).done(function(data) {
        $("#total_typos").text(data.total_typos);
        $("#typos_ignored").text(data.typos_ignored);
        $("#pages_analyzed").text(data.pages_analyzed);
        $("#pages_left_to_download").text(data.pages_left_to_download);
        $("#pages_left_to_check").text(data.pages_left_to_check);
        if (data.pages_left > 0) {
            setTimeout(updateProjectStats, 300);
        }
    });
};

$(function() {
    $tpl = $(".js-template.ortho-error-row");
    $container = $('#errors-container');
    $.ajax({url: serverUrl + 'errors'}).done(function(data) {
        errors = data.errors;
        for (var i = 0; i < 5; i++) {
            createNewElement();
        }
        createStatsBlock();
    });
    $(document).on('click', "a.toggle-url-list", function() {
        $(this).closest(".ortho-error").find(".urlList").slideToggle();
    });
    $(document).on('click', "a.ignore", function() {
        var $el = $(this).closest(".ortho-error");
        var id = $el.find(".error_id").val();
        $el.remove();
        $.ajax({url: serverUrl + 'errors/' + id + '/ignore'}).done(updateProjectStats);
        createNewElement();
    });
    $(document).on('click', "a.fix", function() {
        var $el = $(this).closest(".ortho-error");
        var id = $el.find(".error_id").val();
        $el.remove();
        $.ajax({url: serverUrl + 'errors/' + id + '/fixed'}).done(updateProjectStats);
        createNewElement();
    });
});
