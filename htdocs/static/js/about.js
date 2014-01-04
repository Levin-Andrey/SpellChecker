$("#send-form").submit(function(event) {
    var $message = $("#message");
    if ($message.val().trim() != "") {
        console.log('ded');
        return;
    };
    event.preventDefault();
});