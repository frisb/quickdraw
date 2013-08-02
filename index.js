var CacheCollection = require('./lib/cachecollection');

var caches = new CacheCollection();

module.exports = function (app) {
    if (app && app.get) {
        // express
        
        app.use(middleware);
        
        app.cacheout = function(path, callback, options) {  
            app.get(path, createListener(options, callback));
        }
    }
    
    return {
        createListener: createListener
    };
}

function createListener(options, callback) {
    return function(req, res) {
        var cache = caches.get(req, options);
        cache.setConditionalHeaders(res);
        callback(req, res);
    }    
}

function middleware(req, res, next) {
    if (caches.items[req.path]) {
        var cache = caches.get(req);
        
        console.log(cache);
        
        if (!isModified(req, res, cache)) {
            removeContentHeaders(res);
            res.statusCode = 304;
            res.end();
            
            // not modified so must end request lifecycle
            return;
        }
        else {
            // is modified so send new headers
            cache.sendHeaders(res);
        }
    }
    
    next();
}

function isModified(req, res, cache) {    
    var modifiedSince = req.headers['if-modified-since'];
    var noneMatch = req.headers['if-none-match'];
    
    if (cache !== null && (modifiedSince || noneMatch)) {    
        // check If-None-Match
        if (noneMatch === cache.headers.ETag) {
            return false;
        }
        
        // check If-Modified-Since
        var lastModified = cache.headers['Last-Modified'];
        
        if (modifiedSince && lastModified) {
            modifiedSince = new Date(modifiedSince);
            lastModified = new Date(lastModified);
            
            if (lastModified <= modifiedSince) { 
                return false;
            }
        }
    }
        
    return true;
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