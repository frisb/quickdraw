var events = require('events');
var util = require('util');

var caches = require('./lib/cachecollection')();

function CacheOut(app) {
    events.EventEmitter.call(this);
    var self = this;
    
    caches.viewPath = app.get('views');
    caches.viewEngine = app.get('view engine');
    
    caches.on('added', function(cache) {
        self.emit('added', cache);
    });
    caches.on('removed', function(cache) {
        self.emit('removed', cache);
    });
    
    if (app) {
        this.enhanceExpress(app);
    }
}

util.inherits(CacheOut, events.EventEmitter);

module.exports = function(app) {
    return new CacheOut(app);
}

CacheOut.prototype.enhanceExpress = function (app) {
    var versionedUrlMiddleware = require('./lib/middleware/versionedurl');
    var conditionMatcherMiddleware = require('./lib/middleware/conditionmatcher');
    var outputCacheMiddleware = require('./lib/middleware/outputcache');
    var staticMiddleware = require('./lib/middleware/static');
    
    app.use(versionedUrlMiddleware);
    app.use(conditionMatcherMiddleware);
    this.static = staticMiddleware;
    
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
                    outputCacheMiddleware(callbacks, options) // inject cache handler
                ];
            }
            
            return fn.apply(app, args);
        }
    }
}