var caches = require('../cachecollection')();

module.exports = function (req, res, next) {
    res.cache = caches.get(req);
    
    if (res.cache) {
        if (!res.cache.isModified(req)) {
            removeContentHeaders(res);
            res.statusCode = 304;
            res.end();
            
            // not modified so must end request lifecycle
            return;
        }
        else {
            // client wants full response so send headers and continue
            res.cache.applyHeaders(res);
            
            if (res.cache.body !== null) {
                res.send(res.cache.body);
                return;
            }
        }
    }
    
    next();
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