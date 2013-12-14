var $tpl, $container, errors;

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

$(function() {
    var serverUrl = "//" + document.domain + "/api/";
    $tpl = $(".js-template.ortho-error");
    $container = $('#errors-container');
    $.ajax({url: serverUrl + 'errors'}).done(function(data) {
        errors = data.errors;
        for (var i = 0; i < 5; i++) {
            createNewElement();
        }
    });
    $(document).on('click', "a.toggle-url-list", function() {
        $(this).closest(".ortho-error").find(".urlList").slideToggle();
    });
    $(document).on('click', "a.ignore", function() {
        var $el = $(this).closest(".ortho-error");
        var id = $el.find(".error_id").val();
        $el.remove();
        $.ajax({url: serverUrl + 'errors/' + id + '/ignore'});
        createNewElement();
    });
    $(document).on('click', "a.fix", function() {
        var $el = $(this).closest(".ortho-error");
        var id = $el.find(".error_id").val();
        $el.remove();
        $.ajax({url: serverUrl + 'errors/' + id + '/fixed'});
        createNewElement();
    });
});
