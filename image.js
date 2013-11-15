var fs = require('fs'),
    http = require('http'),
    restify = require('restify'),
    query = require('./query'),
    pg = require("pg"),
    Q = require("q");


var img = fs.readFileSync('./tracking.gif');

var server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());


server.get('/ping', function (req, res, next) {
  res.send(200, {still: 'alive'})
  return next();
}

server.get('/tp/:tracking', function (req, res, next) {
  var current = 0;
  var total = img.length;
  var intrv;

  function limp(){
    if(current >= total) {
      clearInterval(intrv);
      return res.end();
    }

    query.invoke(["UPDATE tracking_pixels SET time_viewed = time_viewed + 1 WHERE tracking = ($1)", [req.params.tracking]]).then(function () {
      var slc = img.slice(current, ++current);
      var didWrite = res.write(slc);
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
      res.setHeader('Content-Length', img.length)
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", 0);

      return next(); 
    }, function (err) {

      res.send(404, {error: 'not found'});
      return next();
    });
});

var dbDetails = process.env.HEROKU_POSTGRESQL_URL

var conString = dbDetails || "postgres://local:@localhost/emailer_development";

pg.connect(conString, function(err, client, done) {
  query.init({pool: pg, dbUrl: conString})

  var port = process.env.PORT || 5000;
  server.listen(port, function () {
    console.log('%s listening at %s', server.name, server.url);
  });
});
