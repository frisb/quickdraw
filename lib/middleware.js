var fs = require('fs');
var path = require('path');
var versionRegex = /^(\/v\d+\.\d+\.\d+)(\/.+)$/;

function Middleware(caches) {
    this.caches = caches;
}

module.exports = Middleware;

Middleware.prototype.versionedPath = function () {
    return function (req, res, next) {   
        var match = req.path.match(versionRegex);
        
        if (match !== null) {
            req.url = match[2];
        }
        
        next();
    }
}

Middleware.prototype.outputCacher = function (handlers, options, rootPath) {
    var self = this;
    
    return function(req, res, next) {
        var cache = self.caches.get(req, options);
        
        if (cache.output) {
            // output is cached
            
            cache.applyHeaders(res);
            res.send(cache.output);
        }
        else {
            if (rootPath) {
                fs.exists(path.join(rootPath, req.path), function (exists) {
                    if (exists) {
                        cacheOutput(req, res, cache, handlers);
                    }
                    else {
                        next();
                    }
                });
            }
            else {
                cacheOutput(req, res, cache, handlers);
            }
        }
    }    
}

function cacheOutput(req, res, cache, handlers) {
    // get a fresh copy
    cache.applyOutputHandler(res);
    
    if (!(handlers instanceof Array)) {
        handlers = [handlers];
    }
    
    for (var i = 0; handlers[i]; i++) {
        handlers[i](req, res);
    }
}

Middleware.prototype.conditionMatcher = function () {
    var self = this;
    
    return function (req, res, next) {
        if (self.caches.items[req.path]) {
            var cache = self.caches.get(req);
            
            if (cache) {
                if (!isModified(req, res, cache)) {
                    removeContentHeaders(res);
                    res.statusCode = 304;
                    res.end();
                    
                    // not modified so must end request lifecycle
                    return;
                }
                else {
                    // client wants full response so send headers and continue
                    cache.applyHeaders(res);
                }
            }
        }
        
        next();
    }
}

function isModified(req, res, cache) {    
    var modifiedSince = req.headers['if-modified-since'];
    var noneMatch = req.headers['if-none-match'];
    
    if (modifiedSince || noneMatch) {    
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