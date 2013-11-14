var pool, dbUrl;
var Q = require("q");

module.exports = {
  init: function (options) {
    pool = options.pool;
    dbUrl = options.dbUrl;
  },

  invoke: function(sql) {
    var deferred = Q.defer();

    pool.connect(dbUrl, function (err, client, done) {
      if (err) deferred.reject(err)

      if (!(sql instanceof Array)) { sql = [sql] }
      console.info(sql)
      var queryReturn = []
      var query = client.query.apply(client, sql);

      query.on('error', function(err) {
        done();
        deferred.reject(err)
      });

      query.on('row', function(row, result) {
        if (row) queryReturn.push(row);
      }.bind(this));

      query.on("end", function (result) {
        done();
        deferred.resolve(queryReturn);
      });
    });

    return deferred.promise;
  }
}

