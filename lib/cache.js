var crypto = require('crypto');

var Vary = require('./vary');

function Cache(req, options) { 
    this.vary = new Vary(req, options);
    this.key = this.vary.aggregateKey;
    this.maxAge = options.maxAge || 31556926;
    this.headers = Object.create(null);
    this.body = (options.cacheOutput ? '' : null); 
    
    this.setCacheControlHeader(options['cache-control'] || '');
    this.setExpiresHeader(); 
    this.setVaryHeader(this.vary.httpHeader);
    
    if (options.depencies) {
        this.dependencies = options.dependencies;
    }
}

module.exports = Cache;

Cache.prototype.setCacheControlHeader = function (cacheControl) {
    cacheControl += (cacheControl.length > 0 ? ', ' : '') + 'max-age=' + (this.maxAge);
    
    if (cacheControl.length > 0) {
        this.headers['Cache-Control'] = cacheControl;
    }
}

Cache.prototype.setExpiresHeader = function () {
    var now = new Date();
    this.headers['Expires'] = new Date(now.getTime() + (this.maxAge * 1000));
}

Cache.prototype.setVaryHeader = function (varyHeader) {
    this.headers['Vary'] = varyHeader;
}

Cache.prototype.setConditionalHeaders = function (data) {
    this.setETag(data);
    this.setLastModified();
}

Cache.prototype.setETag = function (data) {
    var hash = crypto.createHash('md5');
    hash.update(data);
    
    this.headers.ETag = '"' + hash.digest('hex').toUpperCase() + '"';
}

Cache.prototype.setLastModified = function () {
    this.headers['Last-Modified'] = new Date().toUTCString();
}

Cache.prototype.isModified = function (req) {    
    var modifiedSince = req.headers['if-modified-since'];
    var noneMatch = req.headers['if-none-match'];
    
    if (modifiedSince || noneMatch) {    
        // check If-None-Match
        if (noneMatch === this.headers.ETag) {
            return false;
        }
        
        // check If-Modified-Since
        var lastModified = this.headers['Last-Modified'];
        
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

// Cache.prototype.applyOutputHandler = function (res) {
//     var self = this;

//     if (res.getHeader('ETag')) {
//         return;
//     }
//     else { 
//         var data = '';
        
//         var write = res.write;
//         res.write = function(chunk) {
//             data += self.buildOutput(chunk);
//             write.apply(res, arguments);
//         }
        
//         var writeHead = res.writeHead;
//         res.writeHead = function (statusCode) {
//             if (self.hash === null) {
//                 self.hash = crypto.createHash('md5');
//             }
            
//             self.headers.ETag = '"' + self.hash.digest('hex').toUpperCase() + '"';
//             self.headers['Last-Modified'] = new Date().toUTCString();
            
//             self.applyHeaders(res);
            
//             self.headers['Content-Type'] = res._headers['content-type'];
            
//             self.hash = null;
            
//             if (statusCode < 400) {
//                 // if (this.output !== null) {
//                 //     this.output = data;
//                 // }
            
//                 res.setHeader('X-CacheKey', self.vary.aggregateKey);
//             }
//             else {
//                 self.lru.del(self.vary.aggregateKey);
//             }
            
//             writeHead.apply(res, arguments);
//         }
        
//         var end = res.end;
//         res.end = function(chunk) {
//             data += self.buildOutput(chunk);
//             end.apply(res, arguments);
//         }
//     }
// }
        
// Cache.prototype.applyHeaders = function (res) {
//     var headerNames = Object.keys(this.headers);
    
//     for (var i = 0; headerNames[i]; i++) {
//         var key = headerNames[i];
//         res.setHeader(key, this.headers[key]);
//     }
// }



// Cache.prototype.buildOutput = function (data) {
//     if (data) {
//         if (typeof(data) !== 'string') {
//             data = data.toString('utf8');
//         }
        
//         return data;
//     }
    
//     return '';
// }