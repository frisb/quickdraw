var events = require('events');
var fs = require('fs');
var util = require('util');

var LRU = require('lru-cache');

var _caches = null;

function CacheCollection() {
    events.EventEmitter.call(this);
    this.items = {};    
    this.fileDeps = {};
}

util.inherits(CacheCollection, events.EventEmitter);

module.exports = function () {
    if (_caches === null) {
        _caches = new CacheCollection();
    }   
    
    return _caches;
}

CacheCollection.prototype.get = function(req) {
    var cache;
    var lru = this.items[req.path];
    
    if (lru) {
        lru.forEach(function(c, key) {
            if (c.vary.test('headers', req.headers) && c.vary.test('params', req.query)) {
                cache = c;
                return;
            }
        });
    }
    
    return cache;
}

CacheCollection.prototype.add = function(req, cache) {
    var self = this;
    
    var lru = this.items[req.path];
    
    if (!lru) {
        // instantiate new lru collection
        lru = new LRU({
            maxAge: cache.maxAge * 1000,
            max: 10 * 1024 * 1024,
            length: determineLength,
            dispose: function (key, value) { 
                self.emit('removed', value);
            }
        });
        
        this.items[req.path] = lru;
        
        if (cache.dependencies) {
            this.dependOnFiles(req.path, cache.dependencies);
        }
    }
    
    // middleware does not have context of configuration options,
    // hence options is only sent on fresh request
    
    lru.set(cache.key, cache);
    self.emit('added', cache);
    
    return cache;
}

function determineLength(item) {
    return (item.body ? item.body.length : 1);
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