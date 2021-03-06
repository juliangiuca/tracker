require('newrelic');

var fs       = require('fs'),
    http     = require('http'),
    restify  = require('restify'),
    query    = require('./query'),
    pg       = require("pg"),
    Q        = require("q"),
    path     = require('path'),
    settings = require('./config/settings');


var img = fs.readFileSync(path.resolve(__dirname, './tracking.gif'));

var server = restify.createServer({
  name: 'tracker',
  version: '1.0.0'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/status/ping', function (req, res, next) {
  res.send(200, {still: 'alive'})
  return next();
});

// Define the different components of a repeating gif. We essentially keep sending 1px images in a gif that won't end.
var startImage = new Buffer("47494638396101000100f00000ffffff00000021f904000400000021ff0b4e45545343415045322e30030100000021ff0b496d6167654d616769636b0e67616d6d613d302e343534353435002c", "hex")
var repeatImage = new Buffer("000000000100010000020244010021f904000400000021ff0b496d6167654d616769636b0e67616d6d613d302e343534353435002c", "hex")
var endImage = new Buffer("00000000010001000002024401003b", "hex")

// Is the db up? Are we connected?
server.get('/status/db', function (req, res, next) {
  query.invoke(["SELECT pg_stat_get_backend_pid(s.backendid) AS procpid, " +
                 "pg_stat_get_backend_activity(s.backendid) AS current_query " +
                 "FROM (SELECT pg_stat_get_backend_idset() AS backendid) AS s;", []]).then(function (dbStatus) {
    res.send(200, dbStatus);
    return next();
  })
})

// Let's look at a demo of the image being streamed
server.get('/status/demo', function (req, res, next) {
  var intrv;

  function staggerImage() {
    var didWrite = res.write(repeatImage);

    if(didWrite === false) {
      clearInterval(intrv);
      return res.end();
    }
  }

  res.setHeader('Content-Type', 'image/gif')
  //res.setHeader('Content-Length', img.length)
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", 0);
  res.write(startImage)
  intrv = setInterval(staggerImage, 100);
  next();

})

// The tracking magic
server.get('/tp/:tracking', function (req, res, next) {

  var intrv;

  function staggerImage(viewId){

    // Increment the db counter by 1 - this is called every 100ms
    query.invoke(["UPDATE views SET time = time + 1 WHERE id = ($1)", [viewId]])
      .then(function () {

        var didWrite = res.write(repeatImage);

        if(didWrite === false) {
          console.log("Closing connection for " + viewId)
          clearInterval(intrv);
          return res.end();
        }
    }, function(err) {
      console.log("something barfed - view_id: " + viewId);
      res.end();
    })
  }


  // Someone opens the email
  query.invoke(["UPDATE tracking_pixels set date_first_viewed = LEAST(date_first_viewed, now()) WHERE tracking = ($1) RETURNING id", [req.params.tracking]])
    .then(function (results) {
      var tp_id = results[0].id;

      // Is this email opened by Gmail?
      var googled = !!req.headers['user-agent'].match(/GoogleImageProxy/);

      // Record the open event with user agent details
      return query.invoke(["INSERT INTO views (tracking_pixel_id, agent, referer, googled, created_at) VALUES ($1, $2, $3, $4, now()) RETURNING id", [tp_id, req.headers['user-agent'], req.headers["referer"], googled]])
    }).then(function(results) {
      var view_id = results[0].id;
      // Set up the stream
      intrv = setInterval( function() { staggerImage(view_id); }, 100 );

      res.setHeader('Content-Type', 'image/gif')
      //res.setHeader('Content-Length', img.length)
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", 0);
      res.write(imageOpener)

      return next();
    }, function (err) {

      res.send(404, {error: 'not found'});
      return next();
    });
});

pg.defaults.user     = settings.database.username
pg.defaults.password = (settings.database.password || null)
pg.defaults.host     = settings.database.host || "localhost"
pg.defaults.database = settings.database.database;

pg.connect(function(err, client, done) {
  query.init({pool: pg})

  var port = process.env.PORT || 80;
  server.listen(port, function () {
    process.setgid('tracker');
    process.setuid('tracker');
    console.log('%s listening at %s', server.name, server.url);
  });
});
