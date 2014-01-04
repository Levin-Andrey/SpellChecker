var nodemailer = require("nodemailer"),
    smtpTransport = nodemailer.createTransport("SMTP",{}),
    Config = require('./Config.js');

exports.sendNewProjectEmail = function(url, callback){
    var mailOptions = {
        from: Config.email.from,
        to: "lennytmp@gmail.com",
        subject: "New project",
        text: "New project was added " + url
    };
    smtpTransport.sendMail(mailOptions, function(err){
        if (err) throw err;
        if (callback) callback();
    });
};