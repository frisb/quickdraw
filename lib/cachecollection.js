var Cache = require('./cache');
var LRU = require('lru-cache');

function CacheCollection() {
    this.items = {};
}

module.exports = CacheCollection;

CacheCollection.prototype.get = function(req, options) {
    var lru = this.items[req.path];
    var cache;
    
    if (!lru) {
        lru = new LRU({
            maxAge: options.maxAge,
            max: 500,
            dispose: function (key, n) { 
                if (options.onExpire) {
                    options.onExpire();
                }
            }
        });
        
        this.items[req.path] = lru;
    }
    
    if (options) {
        // can set
        
        var key = generateKey(req, options);        
        cache = lru.get(key);
        
        if (!cache) {
            cache = new Cache(options);
            lru.set(key, cache);
        }
    }
    else {
        // search all keys
        
        lru.forEach(function(value, key) {
            var sections = key.split('|');
            
            if (testKeyVary(sections[1], req) && testKeyVary(sections[2], req)) {
                cache = value;
                return;
            }
        });
        
        console.log(cache);
    }
    
    return cache;
}

function testKeyVary(vary, req) {
    if (vary) {
        vary = vary.split('&');
                    
        for (var j = 0; vary[j]; j++) {
            var h = vary[j];
            
            var ns = h.substr(0, 1);
            var kv = h.substr(2).split('=');
            
            var collection = (ns == 'h' ? req.headers : req.query);
            
            if (collection[kv[0]] !== kv[1]) {
                return false;
            }
        }
    }
    
    return true;
}

function generateKey(req, options) {
    var key = req.path;
    
    if (options.varyByHeaders) {
        key += addVary('h', options.varyByHeaders, req.headers);
    }
    
    if (options.varyByParams) {
        key += addVary('p', options.varyByParams, req.query);
    }
    
    return key;
 }
 
function addVary(ns, vary, collection) {
    var str = '';
    
    if (vary) {
        if (typeof(vary) === 'string') {
            vary = vary.split(',');
        }
        
        for (var i = 0; vary[i]; i++) {
            var key = vary[i].trim().toLowerCase();
            
            if (collection[key]) {
                str += '|' + (str.length > 0 ? '&' : '') + ns + ':' + key + '=' + collection[key];
            }
        }
    }
    
    return str;
}