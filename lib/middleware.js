var fs = require('fs');
var path = require('path');

var Cache = require('./cache');

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

Middleware.prototype.outputCache = function (handlers, options, rootPath) {
    var self = this;
    
    return function(req, res, next) {
        if (options['cache-control'] && options['cache-control'] !== 'no-cache') {
            res.cache = new Cache(req, options);
            
            if (res.cache.output) {
                // output is cached
                
                res.cache.applyHeaders(res);
                res.send(res.cache.output);
            }
            else {
                if (rootPath) {
                    fs.exists(path.join(rootPath, req.path), function (exists) {
                        if (exists) {
                            self.doCache(req, res, handlers);
                        }
                        else {
                            next();
                        }
                    });
                }
                else {
                    self.doCache(req, res, handlers);
                }
            }
        }
        else {
            next();
        }
    }    
}

Middleware.prototype.doCache = function (req, res, handlers) {
    // get a fresh copy
    this.applyOutputHandler(req, res);
    
    if (!(handlers instanceof Array)) {
        handlers = [handlers];
    }
    
    for (var i = 0; handlers[i]; i++) {
        handlers[i](req, res);
    }
}

Middleware.prototype.applyOutputHandler = function (req, res) {
    var self = this;
    var data;
        
    function buildOutput(chunk) {
        if (chunk) {
            if (!data) {
                data = chunk;
            }
            else if (chunk instanceof Buffer) {
                Buffer.concat([data, chunk]);
                //data = data.toString('utf8');
            }
            else {
                data += chunk;
            }
        }
    }
        
    if (res.getHeader('ETag')) {
        return;
    }
    else { 
        var write = res.write;
        res.write = function(chunk) {
            buildOutput(chunk);
            write.apply(res, arguments);
        }
        
        var writeHead = res.writeHead;
        res.writeHead = function (statusCode) {
            if (statusCode < 400) {
                if (data) {
                    res.cache.setConditionalHeaders(data);
                }
                
                applyHeaders(res);
                
                res.cache.headers['Content-Type'] = res._headers['content-type'];
                
                if (res.cache.body !== null) {
                    // cache output
                    res.cache.body = data;
                }
            
                res.setHeader('X-CacheKey', res.cache.key);
                
                self.caches.add(req, res.cache);   
            }   
            
            writeHead.apply(res, arguments);
        }
        
        var end = res.end;
        res.end = function(chunk) {
            buildOutput(chunk);
            end.apply(res, arguments);
        }
    }
}

function applyHeaders(res) {
    var headerNames = Object.keys(res.cache.headers);
    
    for (var i = 0; headerNames[i]; i++) {
        var key = headerNames[i];
        res.setHeader(key, res.cache.headers[key]);
    }
}

Middleware.prototype.conditionMatcher = function () {
    var self = this;
    
    return function (req, res, next) {
        var cache = self.caches.get(req);
        
        if (cache) {
            if (!cache.isModified(req)) {
                removeContentHeaders(res);
                res.statusCode = 304;
                res.end();
                
                // not modified so must end request lifecycle
                return;
            }
            else {
                // client wants full response so send headers and continue
                res.cache = cache;
                applyHeaders(res);
                
                if (cache.body !== null) {
                    res.send(cache.body);
                    return;
                }
            }
        }
        
        next();
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