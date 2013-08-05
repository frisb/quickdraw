cacheout
===

/kæʃ'aʊt/ (cash-out)

cacheout applies high performance http caching client-side and server-side caching for node.js and express.

inspired by etagify and a general community requirement for simplified cache control, cacheout leverages @isaacs' [node-lru-cache](https://github.com/isaacs/node-lru-cache) for cache item storage limits and ttl.

cacheout offers an extremely simple interface for applying instant cacheability to node.js web servers and express applications.

contributions are welcome of course.

## examples

### Cache-Control: private

cache on the server and client only for 60 seconds, varying by "User-Agent" header and "Test" querystring parameter

``` js
var express = require('express');
var http = require('http');

var app = express();
var cacheout = require('cacheout')(app);

var options = {
    maxAge: 60,                     // 60sec
    cacheability: 'private',        // only cache on the browser, not intermediate proxies
    varyByHeaders: 'User-Agent',    // vary by browser useragent
    varyByParams: 'Test',           // also vary by querystring param Test
    cacheOutput: true               // cache rendered output so not re-rendered for the next <maxAge> seconds
};

app.cache('/', function(req, res) {
    res.send('output generated ' + new Date().toUTCString());
}, options);

http.createServer(app).listen(3333, function() {
  console.log('Express server listening on port ' + 3333);
});
```


### Cache-Control: public

cache downstream for 15 seconds, with no vary

``` js
var express = require('express');
var http = require('http');

var app = express();
var cacheout = require('cacheout')(app);

var options = {
    maxAge: 15,                     // 15sec
    cacheability: 'public',         // cache on browser and intermediate proxies
    cacheOutput: false              // do not cache rendered output
};

app.cache('/', function(req, res) {
    res.send('output generated ' + new Date().toUTCString());
}, options);

http.createServer(app).listen(3333, function() {
  console.log('Express server listening on port ' + 3333);
});
```

### wiring up events

``` js
cacheout.on('added', function(cache) {
    console.log('added ' + cache.vary.aggregateKey)
});

cacheout.on('removed', function(cache) {
    console.log('removed ' + cache.vary.aggregateKey)
});app.cache
```

## installation

```
  npm install cacheout
```

## enjoy :)

#### the frisB.com team ( [ring the world](http://www.frisb.com "frisB.com") )


## License

(The MIT License)

Copyright (c) frisB.com &lt;play@frisb.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.