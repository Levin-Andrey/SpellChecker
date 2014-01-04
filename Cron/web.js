var fs = require('fs'),
    express = require('express'),
    mongojs = require('mongojs'),
    swig = require('swig'),
    Config = require('../Class/Config.js'),
    Mailer = require('../Class/MailHelper.js'),
    async = require('async');

var app = express();
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('view cache', false);
app.set('views', __dirname + '/../View');
swig.setDefaults({ cache: false }); // TODO: use cache on prod
app.use(express.bodyParser());
var db = mongojs.connect("spell", ["pages", "errors", "projects"]);

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/about', function (req, res) {
    res.render('about');
});

app.post('/about', function(req, res) {
    var email = req.body.email;
    var message = req.body.message;
    Mailer.sendMessage(email, message);
    res.render('about', {success: true});
});

app.get('/project', function (req, res) {
    res.render('project');
});

app.get('/api/typos/:id/ignore', function(req, res) {
    try {
        var id = mongojs.ObjectId(req.params.id);
    } catch (e) {
        res.send({error: "incorrect id"});
        return;
    }
    db.errors.findAndModify({
        query:{_id: id},
        update: {$set: {ignore: true}}
    }, function(err, result){
        if (err) {
            throw err;
        }
        if (result) {
            res.send({error: "ok"});
            return;
        }
        res.send({error: "not found"});
    });
});

app.get('/api/typos/:id/fixed', function(req, res) {
    try {
        var id = mongojs.ObjectId(req.params.id);
    } catch (e) {
        res.send({error: "incorrect id"});
        return;
    }
    db.errors.findOne({_id: id}, function(err, typo) {
        if (!typo) {
            res.send({error: "not found"});
            return;
        }
        db.pages.find({_id: {$in: typo.page_ids}}, function(err2, pages) {
            pages.forEach(function(page) {
                delete page.downloaded_at;
                delete page.checked_at;
                db.pages.save(page);
            });
        });
        db.errors.remove({_id: id});
        res.send({error: "ok"});
    });
});

app.get('/api/projects/:id/stats', function(req, res) {
    try {
        var id = mongojs.ObjectId(req.params.id);
    } catch (e) {
        res.send({error: "incorrect id"});
        return;
    }
    async.parallel([
            function(callback) {
                db.pages.count({project_id: id, downloaded_at: {$exists: true}}, callback);
            },
            function(callback) {
                db.pages.count({project_id: id, checked_at: {$exists: true}, downloaded_at: {$exists: true}}, callback);
            },
            function(callback) {
                db.errors.count({project_id: id, ignore: {$exists: true}}, callback);
            },
            function(callback) {
                db.errors.count({project_id: id, ignore: {$exists: false}}, callback);
            },
            function(callback) {
                db.projects.findOne({_id: id}, callback);
            },
            function(callback) {
                db.pages.count({project_id: id, processing_by: {$exists: 1}}, callback)
            }
        ],
        function(err, results){
            if (!results[4]) {
                res.send({error: "No such project"});
                return;
            }
            if (err) throw err;
            var result = {};
            result.pages_downloaded = results[0];
            result.pages_checked = results[1];
            result.typos_ignored = results[2];
            result.typos_to_review = results[3];
            result.project_started_at = results[4].started_at;
            result.pages_limit = false;
            if (result.pages_checked >= Config.project.pages_limit) {
                result.pages_limit = true;
            }
            result.in_progress = results[5] > 0 || !result.project_started_at;
            res.send({error: 'ok', stats: result});
        });
});

app.get('/api/projects/:id/typos', function(req, res) {
    try {
        var id = mongojs.ObjectId(req.params.id);
    } catch (e) {
        res.send({error: "incorrect id"});
        return;
    }
    db.errors.find({project_id: id, ignore: {$exists: false}}, {created: 0, project_id: 0})
        .limit(100).sort({pages_count: 1}, function(err, typos) {
            if (err) {
                throw err;
            }
            var page_ids = [];
            typos.forEach(function(typo) {
                typo.page_ids.forEach(function(page_id) {
                    page_ids.push(page_id);
                });
            });
            var pageData = {};
            db.pages.find({_id: {$in: page_ids}}, {_id: 1, url:1}, function(err, pages){
                pages.forEach(function(page) {
                    pageData[page._id] = page.url;
                });
                typos.forEach(function(typo) {
                    typo.pages = [];
                    typo.page_ids.forEach(function (page_id) {
                        typo.pages.push(pageData[page_id]);
                    });
                    delete typo.page_ids;
                });
                res.send({typos: typos});
            });
        });
});

app.post('/api/projects/', function(req, res) {
    var url = req.body.url;
    if (!url) {
        res.send({error: "no url"});
        return;
    }
    var host = url.replace(/^\w+:\/\//, "").replace(/\/.*$/, "");
    var date = new Date();
    db.projects.findAndModify({
        query: {host: host},
        update: {$setOnInsert: {url: url, host: host, created: date}},
        upsert: true,
        new: true
    }, function(err, project){
        if (err) {
            res.send({error: err});
            throw {project: project, err: err};
        }
        if (date - project.created == 0) {
            Mailer.sendNewProjectEmail(url);
        }
        res.send({
            error: "ok",
            project: {
                id: project._id,
                host: project.host
            }
        });
    });
});

app.use(function(err, req, res, next){
    console.error(err.stack);
    res.send(500);
});

// for dev: listen socket in the current directory
// nginx proxy use this socket to handle non-static requests
var socket = './web.sock';
fs.unlink(socket, function () {
    app.listen(socket, function () {
        fs.chmod(socket, 0777);
        console.log("Ready to serve requests!");
    });
});
