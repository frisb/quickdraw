var events = require('events');
var express = require('express');
var util = require('util');

var CacheCollection = require('./lib/cachecollection');
var Middleware = require('./lib/middleware');

function CacheOut(app) {
    events.EventEmitter.call(this);
    var self = this;
    
    this.caches = new CacheCollection();
    this.caches.on('added', function(cache) {
        self.emit('added', cache);
    });
    this.caches.on('removed', function(cache) {
        self.emit('removed', cache);
    });
    
    this.middleware = new Middleware(this.caches);
    
    if (app) {
        this.enhanceExpress(app);
    }
}

util.inherits(CacheOut, events.EventEmitter);

module.exports = function(app) {
    return new CacheOut(app);
}

CacheOut.prototype.enhanceExpress = function (app) {
    var self = this;
    
    app.enable('view cache');
    
    app.use(this.middleware.versionedPath());
    app.use(this.middleware.conditionMatcher());
    
    this.static = function (root, options) {
        var handler = express.static(root, options);
        return self.middleware.outputCacher(handler, options, root);
    }
    
    cacheVerb('get');
    cacheVerb('post');
    cacheVerb('all');
    
    function cacheVerb(verb) {
        var fn = app[verb];
        app[verb] = function () {
            var args = arguments;
            
            if (arguments.length > 1 && typeof(arguments[arguments.length - 1]) == 'object') {
                var path = arguments[0];
                var options = arguments[arguments.length - 1];
                var callbacks = Array.prototype.slice.call(arguments, 1, arguments.length - 1);
                
                args = [
                    path,
                    self.middleware.outputCacher(callbacks, options) // inject cache handler
                ];
            }
            
            return fn.apply(app, args);
        }
    }
}