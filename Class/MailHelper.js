var nodemailer = require("nodemailer"),
    smtpTransport = nodemailer.createTransport("SMTP",{}),
    Config = require('./Config.js');

exports.sendNewProjectEmail = function(url, callback){
    var mailOptions = {
        from: Config.email.from,
        to: Config.email.to,
        subject: "New project",
        text: "New project was added " + url
    };
    smtpTransport.sendMail(mailOptions, function(err){
        if (err) throw err;
        if (callback) callback();
    });
};

exports.sendMessage = function(sender, message, callback) {
    var mailOptions = {
        from: Config.email.from,
        to: Config.email.to,
        subject: "New message from SpellChecker",
        text: "New message from SpellChecker \n email: " + sender + " \n message: " + message
    };
    smtpTransport.sendMail(mailOptions, function(err){
        if (err) throw err;
        if (callback) callback();
    });
};