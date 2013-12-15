var fs = require('fs');
var express = require('express');
var mongojs = require('mongojs');
var swig = require('swig');

var app = express();
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('view cache', false);
app.set('views', __dirname + '/views');
swig.setDefaults({ cache: false }); // TODO: use cache on prod


var getDb = function() {
    return db = mongojs.connect("spell", ["pages", "errors", "projects"]);
};

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/about', function (req, res) {
    res.render('about');
});

app.get('/api/errors', function(req, res) {
    var db = getDb();
    db.errors.find({ignore: {$exists: false}}, {created:0, project_id: 0})
        .limit(100).sort({pages_count: -1}, function(err, errors) {
        var page_ids = [];
        errors.forEach(function(error) {
            error.page_ids.forEach(function(page_id) {
                page_ids.push(page_id);
            });
        });
        var pageData = {};
        db.pages.find({_id: {$in: page_ids}}, {_id: 1, url:1}, function(err, pages){
            pages.forEach(function(page) {
                pageData[page._id] = page.url;
            });
            errors.forEach(function(error) {
                error.pages = [];
                error.page_ids.forEach(function (page_id) {
                    error.pages.push(pageData[page_id]);
                });
                delete error.page_ids;
            });
            res.send({errors: errors});
            db.close();
        });
    });
});

app.get('/api/errors/:id/ignore', function(req, res) {
    var db = getDb();
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
            res.send({error: err});
            return;
        }
        if (result) {
            res.send({error: "ok"});
            return;
        }
        res.send({error: "not found"});
    });
});

app.get('/api/errors/:id/fixed', function(req, res) {
    var db = getDb();
    try {
        var id = mongojs.ObjectId(req.params.id);
    } catch (e) {
        res.send({error: "incorrect id"});
        return;
    }
    db.errors.findOne({_id: id}, function(err, spellErr) {
        if (!spellErr) {
            res.send({error: "not found"});
            return;
        }
        db.pages.find({_id: {$in: spellErr.page_ids}}, function(err2, pages) {
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
    var db = getDb();
    try {
        var id = mongojs.ObjectId(req.params.id);
    } catch (e) {
        res.send({error: "incorrect id"});
        return;
    }
    var result = {};
    db.pages.count({project_id: id, downloaded_at: {$exists: true}}, function(err, pages_analyzed) {
        result.pages_analyzed = pages_analyzed;
        db.pages.count({project_id: id, downloaded_at: {$exists: false}}, function (err, pages_left_to_download) {
            result.pages_left_to_download = pages_left_to_download;
            db.pages.count({project_id: id, checked_at: {$exists: false}}, function (err, pages_left_to_check) {
                result.pages_left_to_check = pages_left_to_check;
                db.errors.count({project_id: id, ignore: {$exists: false}}, function(err, typos_to_review) {
                    result.typos_to_review = typos_to_review;
                    db.errors.count({ignore: {$exists: true}}, function(err, typos_ignored) {
                        result.typos_ignored = typos_ignored;
                        res.send(result);
                    });
                });
            });
        });
    });
});

app.use(function(err, req, res, next){
    console.error(err.stack);
    res.send(500);
});

// for dev: listen socket in the current directory
// nginx proxy use this socket to handle non-static requests
var socket = './web.sock'
fs.unlink(socket, function () {
    app.listen(socket, function () {
        fs.chmod(socket, 0777);
        console.log("Ready to serve requests!");
    });
});
