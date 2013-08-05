var events = require('events');
var util = require('util');

var CacheCollection = require('./lib/cachecollection');

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
    
    if (app && app.get) {
        // express
        
        app.use(middleware);
        
        app.cacheout = function(path, callback, options) {  
            app.get(path, self.createListener(options, callback));
        }
    }

    function middleware(req, res, next) {
        if (self.caches.items[req.path]) {
            var cache = self.caches.get(req);
            
            if (cache) {
                if (!cache.isModified(req, res)) {
                    removeContentHeaders(res);
                    res.statusCode = 304;
                    res.end();
                    
                    // not modified so must end request lifecycle
                    return;
                }
                else {
                    // client wants full response so send headers and continue
                    cache.sendHeaders(res);
                }
            }
        }
        
        next();
    }
}

util.inherits(CacheOut, events.EventEmitter);

module.exports = function(app) {
    return new CacheOut(app);
}

CacheOut.prototype.createListener = function (options, callback) {
    var self = this;
    
    return function(req, res) {
        var cache = self.caches.get(req, options);
        
        if (cache.output) {
            // output is cached
            
            console.log(cache.output);
            
            cache.sendHeaders(res);
            res.send(cache.output);
        }
        else {
            // get a fresh copy
            cache.applyRenderingHandler(res);
            callback(req, res);
        }
    }    
}

function removeContentHeaders(res){
    if (res._headers) {
        var headerNames = Object.keys(res._headers);
        
        for (var i = 0; headerNames[i]; i++) {
            var headerName = headerNames[i];
            if (headerName.indexOf('content') === 0) {
                res.removeHeader(headerName);
            }
        }
    }
}