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


server.get('/tp/:tracking', function (req, res, next) {
  var current = 0;
  var total = img.length;
  var intrv;

  function limp(){
    if(current >= total) return res.end();

    query.invoke(["UPDATE tracking_pixels SET time_viewed = time_viewed + 1 WHERE tracking = ($1)", [req.params.tracking]]).then(function () {
      var slc = img.slice(current, ++current);
      return res.write(slc);
    })
  }

  res.setHeader('Content-Type', 'image/gif')
  res.setHeader('Content-Length', img.length)
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", 0);

  query.invoke(["UPDATE tracking_pixels SET views = views + 1, date_first_viewed = LEAST(date_first_viewed, now()) WHERE tracking = ($1)", [req.params.tracking]]).then(function () {
    intrv = setInterval(limp, 100);

    return next();
  });
});

var conString = "postgres://local:@localhost/emailer_development";

pg.connect(conString, function(err, client, done) {
  query.init({pool: pg, dbUrl: conString})

  server.listen(8080, function () {
    console.log('%s listening at %s', server.name, server.url);
  });
});
