var crypto = require('crypto');
var moment = require('moment');

function Cache(options) { 
    this.headers = {};
    
    if (options) {
        this.setCacheControl(options);
        this.setExpires(options);
        this.setVary(options);        
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

Cache.prototype.setVary = function(options) {
    if (options.varyByHeaders) {
        var vary = options.varyByHeaders;
        var header = '';
        
        if (typeof(vary) === 'string') {
            vary = vary.split(',');
        }
        
        for (var i = 0; vary[i]; i++) {
            header += vary[i].trim();
            
            if (i < vary.length - 1) {
                header += ', ';
            }
        }
        
        if (header.length > 0) {
            this.headers.Vary = header;
        }
    }
}


Cache.prototype.setConditionalHeaders = function (res) {
    var self = this;
    
    if (res.getHeader('ETag')) {
        return;
    }
    else {    
        var hash = crypto.createHash('md5');
        
        var write = res.write;
        res.write = function(chunk) {
            hash.update(chunk);
            write.call(res, chunk);
        };
        
        var end = res.end;
        res.end = function(body) {
            if (body) {
                hash.update(body);
            }
            
            self.headers.ETag = '"' + hash.digest('hex').toUpperCase() + '"';
            self.headers['Last-Modified'] = moment().format('ddd, Do MMM YYYY, HH:mm:ss') + ' GMT';
            
            self.sendHeaders(res);
            
            end.apply(res, arguments);
        }
    }
}

Cache.prototype.sendHeaders = function(res) {
    var headerNames = Object.keys(this.headers);
            
    for (var i = 0; headerNames[i]; i++) {
        var key = headerNames[i];
        res.setHeader(key, this.headers[key]);
    }
}