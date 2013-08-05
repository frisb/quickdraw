var crypto = require('crypto');

function Cache(options, vary) { 
    this.headers = {};
    this.vary = vary;
    this.output = (options.cacheOutput ? '' : null);   
    this.hash = crypto.createHash('md5');
    
    if (options) {
        this.setCacheControl(options);
        this.setExpires(options);        
        this.headers.Vary = this.vary.httpHeader;
    }
}

module.exports = Cache;

Cache.prototype.setCacheControl = function(options) {
    var cacheControl = options.cacheability || '';
    
    if (options.maxAge) {
        cacheControl += (cacheControl.length > 0 ? ', ' : '') + 'max-age=' + options.maxAge;
    }
    
    if (cacheControl.length > 0) {
        this.headers['Cache-Control'] = cacheControl;
    }
}

Cache.prototype.setExpires = function(options) {
    if (options.maxAge) {
        var now = new Date();
        this.headers['Expires'] = new Date(now.getTime() + (options.maxAge * 1000));
    }
}

Cache.prototype.applyRenderingHandler = function (res) {
    var self = this;
    
    if (res.getHeader('ETag')) {
        return;
    }
    else { 
        var write = res.write;
        res.write = function(chunk) {
            self.buildResponseContent(chunk);
            write.call(res, chunk);
        };
        
        var end = res.end;
        res.end = function(body) {
            self.buildResponseContent(body);
            
            self.setConditionalHeaders();
            self.sendHeaders(res);
            
            end.apply(res, arguments);
        }
    }
}
        
Cache.prototype.buildResponseContent = function (data) {
    if (data) {
        this.hash.update(data);
        
        if (this.output !== null) {
            if (typeof(data) !== 'string') {
                data = data.toString('utf8');
            }
        
            this.output += data;
        }
    }
}

Cache.prototype.setConditionalHeaders = function () {
    this.headers.ETag = '"' + this.hash.digest('hex').toUpperCase() + '"';
    this.headers['Last-Modified'] = new Date().toUTCString();
}

Cache.prototype.sendHeaders = function(res) {
    var headerNames = Object.keys(this.headers);
            
    for (var i = 0; headerNames[i]; i++) {
        var key = headerNames[i];
        res.setHeader(key, this.headers[key]);
    }
}

Cache.prototype.isModified = function (req, res) {    
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