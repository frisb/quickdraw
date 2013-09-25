var caches = require('../cachecollection')();
var fs = require('fs');
var path = require('path');

var Cache = require('../cache');

module.exports = function (handlers, options, rootPath) {
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
                    var filePath = path.join(rootPath, req.path);
                    fs.exists(filePath, function (exists) {
                        if (exists) {
                            res.cache.dependencies.push(filePath);
                            applyCaching(req, res, handlers);
                        }
                        else {
                            next();
                        }
                    });
                }
                else {
                    applyCaching(req, res, handlers);
                }
            }
        }
        else {
            next();
        }
    }    
}

function applyCaching(req, res, handlers) {
    // get a fresh copy
    applyOutputHandler(req, res);
    
    if (!(handlers instanceof Array)) {
        handlers = [handlers];
    }
    
    for (var i = 0; handlers[i]; i++) {
        handlers[i](req, res);
    }
}

function applyOutputHandler(req, res) {
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
            write.call(res, chunk);
        }
        
        var end = res.end;
        res.end = function(chunk) {
            res.write = write;
            buildOutput(chunk);
            end.apply(res, arguments);
        }
        
        var render = res.render;
        res.render = function (view, options) {
            // disable express 'view cache'
            options.cache = false;
            
            // cache must depend on view file path
            res.cache.addDependency(path.join(caches.viewPath, view + '.' + caches.viewEngine));
            
            render.apply(res, arguments);
        }
        
        var writeHead = res.writeHead;
        res.writeHead = function (statusCode) {
            if (statusCode < 400) {
                if (data) {
                    res.cache.setConditionalHeaders(data);
                }
                
                res.cache.headers['Content-Type'] = res._headers['content-type'];
                res.cache.applyHeaders(res);
                
                if (res.cache.body !== null) {
                    res.cache.body = data;
                }
                
                caches.add(req, res.cache);   
            }   
            
            writeHead.apply(res, arguments);
        }
    }
}