var express = require('express');
var app = express();
var mongojs = require('mongojs');

var getDb = function() {
    return db = mongojs.connect("spell", ["pages", "errors"]);
};

app.get('/api/errors', function(req, res) {
    var db = getDb();
    db.errors.find({ignore: {$exists: false}}, {created:0, project_id: 0})
        .sort({pages_count: -1}, function(err, errors) {
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

app.listen(8080);