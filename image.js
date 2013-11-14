var fs = require('fs'),
    http = require('http')


var img = fs.readFileSync('./small.png');

var srv = http.createServer(function (req, res) {
  // computer blue balls
  // res is a writable stream
  // img is a buffer
  var current = 0;
  var total   = img.length;
  res.setHeader('Content-Type', 'image/png')
  function limp(){
    if(current >= total) return res.end();
    var slc = img.slice(current, ++current);
    res.write(slc);
  }
  var intrv = setInterval(limp, 5);
});

srv.listen(process.env.PORT || 8080);

