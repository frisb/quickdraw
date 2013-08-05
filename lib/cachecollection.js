var events = require('events');
var util = require('util');

var Cache = require('./cache');
var LRU = require('lru-cache');
var Vary = require('./vary');

function CacheCollection() {
    events.EventEmitter.call(this);
    this.items = {};
}

util.inherits(CacheCollection, events.EventEmitter);
module.exports = CacheCollection;

CacheCollection.prototype.get = function(req, options) {
    var self = this;
    
    var lru = this.items[req.path];
    var cache;
    
    if (!lru) {
        // instantiate new lru collection
        lru = new LRU({
            maxAge: options.maxAge * 1000,
            max: 500,
            dispose: function (key, value) { 
                self.emit('removed', value);
            }
        });
        
        this.items[req.path] = lru;
    }
    
    // middleware does not have context of confiuguration options,
    // hence options is only sent on fresh request
    if (options) {
        // http listener request
        
        var vary = new Vary(req, options);        
        var key = vary.aggregateKey;
        cache = lru.get(key); 
        
        if (!cache) {
            // cache item does not exist so set new
            
            cache = new Cache(options, vary);
            lru.set(key, cache);
            self.emit('added', cache);
        }
    }
    else {
        // middleware
        
        lru.forEach(function(value, key) {
            var vary = value.vary;
            
            if (vary.test('headers', req.headers) && vary.test('params', req.query)) {
                cache = lru.get(key);
                return;
            }
        });
    }
    
    return cache;
}