function Vary(req, options) {
    this.aggregateKey = req.path;
    this.httpHeader = '';
    this.load('headers', options.varyByHeaders, req.headers);
    this.load('params', options.varyByParams, req.query);
    
    if (this.httpHeader.length > 0) {
        this.httpHeader = this.httpHeader;
    }
    else {
        this.httpHeader = undefined;
    }
}

module.exports = Vary;

Vary.prototype.load = function (type, varyKeys, collection) {
    var str = '';
    var ns = type.substr(0, 1);
    var keyVals = {};
    
    if (varyKeys) {
        if (typeof(varyKeys) === 'string') {
            varyKeys = varyKeys.split(',');
        }
        
        varyKeys.sort(keySorter);
        
        for (var i = 0; varyKeys[i]; i++) {
            var key = varyKeys[i].trim();
            var val = null;
            
            var colKey = (type === 'headers' ? key.toLowerCase() : key);
            
            if (collection[colKey]) {
                val = collection[colKey];
                str += '|' + (str.length > 0 ? '&' : '') + ns + ':' + colKey + '=' + val;
            }
            
            keyVals[key] = val;
            
            if (type === 'headers') {
                this.httpHeader += key;
                
                if (i < varyKeys.length - 1) {
                    this.httpHeader += ', ';
                }
            }
        }
    }
    
    this[type] = keyVals;
    this.aggregateKey += escape(str);
}

Vary.prototype.test = function (type, collection) {
    var keyVals = this[type];
    
    if (keyVals) {
        var keys = Object.keys(keyVals);
        
        for (var i = 0; keys[i]; i++) {
            var key = keys[i];
            var colKey = (type === 'headers' ? key.toLowerCase() : key);
            var colVal = collection[colKey] || null; // equate collection value to null if undefined
            
            
            if (keyVals[key] !== colVal) {
                return false;
            }
        }
    }
    
    return true;
}

function keySorter(x, y) {
    if (x > y) {
		return -1;
	}
	else if (x < y) {
		return 1;
	}

	return 0;
}