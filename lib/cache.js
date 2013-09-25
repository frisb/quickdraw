var crypto = require('crypto');

var Vary = require('./vary');

function Cache(req, options) { 
    this.vary = new Vary(req, options);
    this.key = this.vary.aggregateKey;
    this.maxAge = options.maxAge || 31556926;
    this.headers = Object.create(null);
    this.dependencies = options.dependencies || [];
    this.body = (options.cacheOutput ? '' : null); 
    
    this.setCacheControlHeader(options['cache-control'] || '');
    this.setExpiresHeader(); 
    this.setVaryHeader(this.vary.httpHeader);
    
    if (options.depencies) {
        this.dependencies = options.dependencies;
    }
}

module.exports = Cache;

Cache.prototype.addDependency = function (filePath) {
    for (var i = 0; this.dependencies[i]; i++) {
        if (this.dependencies[i] == filePath) {
            return;
        }
    }
    
    this.dependencies.push(filePath);
}

Cache.prototype.applyHeaders = function (res) {
    var headerNames = Object.keys(this.headers);
    
    for (var i = 0; headerNames[i]; i++) {
        var key = headerNames[i];
        res.setHeader(key, this.headers[key]);
    }
            
    res.setHeader('X-quickdraw', this.key);
}

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