var events = require('events');
var fs = require('fs');
var util = require('util');

var Cache = require('./cache');
var LRU = require('lru-cache');
var Vary = require('./vary');

function CacheCollection() {
    events.EventEmitter.call(this);
    this.items = {};    
    this.fileDeps = {};
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
        
        if (options) {
            this.dependOnFiles(req.path, options.fileDependencies);
        }
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

CacheCollection.prototype.dependOnFiles = function (path, files) {
    if (files) {
        for (var i = 0; files[i]; i++) {
            var file = files[i];
            
            var dep = this.fileDeps[file];
            
            if (!dep) {
                dep = [];
                this.fileDeps[file] = dep;
                this.addWatch(file);
            }
            
            for (var j = 0; dep[j]; j++) {
                if (dep[j] === path) {
                    // file dependency exists for this path
                    return;
                }
            }
            
            // file dependency does not exist for this path so add it
            dep.push(path);
        }
    }
}

CacheCollection.prototype.addWatch = function(file) {
    var self = this;
    
    fs.watch(file, function (event, filename) {
        if (event === 'change') {
            setTimeout(function() {
                self.removeLRUs(file);
            }, 1000);
        }
    });
}

CacheCollection.prototype.removeLRUs = function(file) {
    var dep = this.fileDeps[file];
    
    if (dep) {
        for (var i = 0; dep[i]; i++) {
            var path = dep[i];
            
            var lru = this.items[path];
            lru.reset();
            
            delete this.items[path];
        }
        
        delete this.fileDeps[file];
    }
}