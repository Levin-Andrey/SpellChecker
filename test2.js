var nodemailer = require("nodemailer");
var smtpTransport = nodemailer.createTransport("SMTP",{});

var url = "http://ya.ru/"

var mailOptions = {
    from: "noreply@spellchecker.ru",
    to: "lennytmp@gmail.com",
    subject: "New project",
    text: "New project was added " + url
};

smtpTransport.sendMail(mailOptions, function(error){
    if (error) {
        console.log(error);
    }
    process.exit(1);
});