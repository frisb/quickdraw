quickdraw
===

quickdraw applies high performance http client and server output caching for node.js express.

partially inspired by [etagify](https://github.com/lloyd/connect-etagify) and a general community requirement for simplified cache control, quickdraw leverages @isaacs' [node-lru-cache](https://github.com/isaacs/node-lru-cache) for cache item storage limits and ttl.

quickdraw offers a frictionless interface for applying instant cacheability to node.js express applications.

contributions are welcome of course.

## features

* `simple api` - Enhances existing express functions.
* `vary` - Vary by headers and querystring parameters.
* `conditional headers` - ETag and Last-Modified.
* `lru` - node-lru-cache under the hood.
* `file dependencies` - For static and dynamic output.
* `server side output cache` - For fast output delivery.
* `versioned url support` - For browser cached url invalidation.
* `static cache` - Custom cache for static files.

## examples

### Dyanamic > Cache-Control: private

cache on the server and client only for 60 seconds, varying by "User-Agent" header and "Test" querystring parameter

``` js
var express = require('express');
var http = require('http');

var app = express();

// instantiate between middleware (preferably below compress and above router)
app.use(express.compress());

var quickdraw = require('quickdraw')(app);

app.use(app.router);

app.get('/', function(req, res) {
    res.send('output generated ' + new Date().toUTCString());
}, {
    'cache-control': 'private',     // only cache on the browser, not intermediate proxies
    maxAge: 60,                     // 60sec
    varyByHeaders: 'User-Agent',    // vary by browser useragent
    varyByParams: 'Test',           // also vary by querystring param Test
    cacheOutput: true               // cache rendered output so not re-rendered for the next <maxAge> seconds
});

http.createServer(app).listen(3333, function() {
  console.log('Express server listening on port ' + 3333);
});
```


### Dynamic > Cache-Control: public with a fileDependency and static cache middleware

cache downstream for 15 seconds, with no vary

``` js
var express = require('express');
var http = require('http');

var app = express();

// instantiate between middleware (preferably below compress and above router)
app.use(express.compress());

var quickdraw = require('quickdraw')(app);

app.use(app.router);

// use instead of express.static for custom cacheability
app.use(quickdraw.static(path.join(__dirname, 'public'), {
    'cache-control': 'public',                      // cache on browser and intermediate proxies
    maxAge: 7 * 60 * 60 * 24,                       // expires after one day
    cacheOutput: true                               // cache output so ouput from memory for the next <maxAge> seconds
}));

app.get('/', function(req, res) {
    res.send('output generated ' + new Date().toUTCString());
}, {
    'cache-control': 'public',                      // cache on browser and intermediate proxies
    maxAge: 15,                                     // 15sec
    cacheOutput: false,                             // do not cache rendered output
    dependencies: ['/path/to/views/layout.jade']    // depend on view template layout file
});

http.createServer(app).listen(3333, function() {
  console.log('Express server listening on port ' + 3333);
});
```

### wiring up events

``` js
quickdraw.on('added', function(cache) {
    console.log('added ' + cache.vary.aggregateKey)
});

quickdraw.on('removed', function(cache) {
    console.log('removed ' + cache.vary.aggregateKey)
});app.cache
```

## installation

```
  npm install quickdraw
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