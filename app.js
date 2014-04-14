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

var imageOpener = new Buffer("47494638396101000100f00000ffffff00000021f904000400000021ff0b4e45545343415045322e30030100000021ff0b496d6167654d616769636b0e67616d6d613d302e343534353435002c", "hex")
var newImage = new Buffer("000000000100010000020244010021f904000400000021ff0b496d6167654d616769636b0e67616d6d613d302e343534353435002c", "hex")
var endImage = new Buffer("00000000010001000002024401003b", "hex")

//    "000000000100010000020244010021f904000400000021ff0b496d6167654d616769636b0e67616d6d613d302e343534353435002c",
//    "000000000100010000020244010021f904000400000021ff0b496d6167654d616769636b0e67616d6d613d302e343534353435002c",
//    "00000000010001000002024401003b"], "hex")

server.get('/status/db', function (req, res, next) {
  query.invoke(["SELECT pg_stat_get_backend_pid(s.backendid) AS procpid, " +
                 "pg_stat_get_backend_activity(s.backendid) AS current_query " +
                 "FROM (SELECT pg_stat_get_backend_idset() AS backendid) AS s;", []]).then(function (dbStatus) {
    res.send(200, dbStatus);
    return next();
  })
})

server.get('/sample', function (req, res, next) {
  var intrv;

  function blueBalls() {
    var didWrite = res.write(newImage);
    console.log("posted a chunk")
    console.log("Did write: " + didWrite)

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
  res.write(imageOpener)
  intrv = setInterval(blueBalls, 100);
  next();

})

server.get('/tp/:tracking', function (req, res, next) {
  var current = 0;
  var intrv;

  function limp(){

    query.invoke(["UPDATE tracking_pixels SET time_viewed = time_viewed + 1 WHERE tracking = ($1)", [req.params.tracking]]).then(function () {
      var didWrite = res.write(newImage);

      console.log("Did write: " + didWrite);

      if(didWrite === false) {
        clearInterval(intrv);
        return res.end();
      }
    })
  }


  query.invoke(["UPDATE tracking_pixels SET views = views + 1, date_first_viewed = LEAST(date_first_viewed, now()) WHERE tracking = ($1) RETURNING id", [req.params.tracking]])
    .then(function (results) {
      var tp_id = results[0].id;
      return query.invoke(["INSERT INTO user_agents (tracking_pixel_id, agent, referer, created_at) VALUES ($1, $2, $3, now())", [tp_id, req.headers['user-agent'], req.headers["referer"]]])
    }).then(function() {
      intrv = setInterval(limp, 100);

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

  var port = process.env.PORT || 5000;
  server.listen(port, function () {
    console.log('%s listening at %s', server.name, server.url);
  });
});
