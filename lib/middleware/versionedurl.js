var versionRegex = /^(\/v\d+\.\d+\.\d+)(\/.+)$/;

module.exports = function (req, res, next) {   
    var match = req.path.match(versionRegex);
    
    if (match !== null) {
        req.url = match[2];
    }
    
    next();
}