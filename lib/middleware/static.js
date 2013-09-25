var express = require('express');
var outputCacheMiddleware = require('./outputcache');

module.exports = function (root, options) {
    var handler = express.static(root, options);
    
    if (options['cache-control'] && options['cache-control'] !== 'no-cache') {
        return outputCacheMiddleware(handler, options, root);
    }
    else {
        return handler;
    }
}