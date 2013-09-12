var crypto = require('crypto');

function Cache(options, vary) { 
    var self = this;
    
    this.hash = null;
    
    this.vary = vary;
    this.headers = Object.create(null);
    this.output = (options.cacheOutput ? '' : null); 
    this.statusCode = -1;
    
    if (options) {
        setCacheControlHeader();
        setExpiresHeader(); 
        setVaryHeader();
    }
    
    function setCacheControlHeader() {
        var cacheControl = options.cacheability || '';
        
        if (options.maxAge) {
            cacheControl += (cacheControl.length > 0 ? ', ' : '') + 'max-age=' + (options.maxAge / 1000);
        }
        
        if (cacheControl.length > 0) {
            self.headers['Cache-Control'] = cacheControl;
        }
    }
    
    function setExpiresHeader() {
        if (options.maxAge) {
            var now = new Date();
            self.headers['Expires'] = new Date(now.getTime() + options.maxAge);
        }
    }
    
    function setVaryHeader() {
        if (vary.httpHeader !== null) {
            self.headers['Vary'] = vary.httpHeader;
        }
    }
}

module.exports = Cache;

Cache.prototype.applyOutputHandler = function (res) {
    var self = this;

    if (res.getHeader('ETag')) {
        return;
    }
    else { 
        var data = '';
        
        var write = res.write;
        res.write = function(chunk) {
            data += self.buildOutput(chunk);
            write.apply(res, arguments);
        }
        
        var writeHead = res.writeHead;
        res.writeHead = function (statusCode) {
            if (self.hash === null) {
                self.hash = crypto.createHash('md5');
            }
            
            self.headers.ETag = '"' + self.hash.digest('hex').toUpperCase() + '"';
            self.headers['Last-Modified'] = new Date().toUTCString();
            
            self.applyHeaders(res);
            
            self.headers['Content-Type'] = res._headers['content-type'];
            
            self.hash = null;
            
            if (statusCode < 400) {
                // if (this.output !== null) {
                //     this.output = data;
                // }
            
                res.setHeader('X-CacheKey', self.vary.aggregateKey);
            }
            else {
                self.lru.del(self.vary.aggregateKey);
            }
            
            writeHead.apply(res, arguments);
        }
        
        var end = res.end;
        res.end = function(chunk) {
            data += self.buildOutput(chunk);
            end.apply(res, arguments);
        }
    }
}
        
Cache.prototype.applyHeaders = function (res) {
    var headerNames = Object.keys(this.headers);
    
    for (var i = 0; headerNames[i]; i++) {
        var key = headerNames[i];
        res.setHeader(key, this.headers[key]);
    }
}



Cache.prototype.buildOutput = function (data) {
    if (data) {
        if (typeof(data) !== 'string') {
            data = data.toString('utf8');
        }
        
        return data;
    }
    
    return '';
}