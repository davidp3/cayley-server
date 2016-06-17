var request     = require('request');
var config      = require('./config')

const ALL_TAG = '__ALL__';

module.exports = {
  'unauth' :
    function(req, res) {
      // TODO: Fill in with unauthorized access behavior.

      // Use a basic mapping strategy.  URL format is
      // /{vertex_name}[/{out|in}/{edge_label|__ALL__}]*
      // which starts at vertex `vertex_name`, then optionally
      // traverses any out or in edge with the name `edge_label`,
      // performing one hop for each of the hops in the path.
      // At most one edge label can be __ALL__, which
      // traverses all edges with the correct direction.
      //
      // The path is limited to four hops.  All matching results are returned.
      // If the path is valid, we just hand it to `auth` below for
      // processing.
      var pieces = req.url.substring(1).split('/');    // drop the first character (a '/') before splitting

      var hasALL = false;
      var query = "g.V('" + pieces[0] + "')";
      var nHops = 0;

      for(var i=1; i<pieces.length; i++) {
        if (i%2 == 0) {
          if (pieces[i] == ALL_TAG) {
            if (hasALL) {
              res.status(400).send('Multiple __ALL__ tags are not permitted.');
              return;
            }
            query = query + ")";
          } else {
            query = query + "'" + pieces[i] + "')";
          }
          nHops++;
        } else {
          pieces[i].toLowerCase();
          if (pieces[i] !== 'in' && pieces[i] !== 'out') {
            res.status(400).send("Request must provide 'in' or 'out' direction before edge label.");
            return;
          }
          query = query + "." + (pieces[i] === 'in' ? "In(" : "Out(");
        }
      }

      query = query + '.All()';

      if ((!hasALL && pieces.length % 2 == 0) || (hasALL && pieces.length % 2 == 1)) {
        res.status(400).send('Incorrect number of path elements in URL.');
        return;
      }

      if (nHops > 4) {
        res.status(400).send('Too many edge hops requested.');
        return;
      }

      // Use "/api/v1/query/gremlin" as the path in gremlin.
      req.url = '/api/v1/query/gremlin';
      req.body = query;
      req.headers['content-type'] = 'text/plain';
      console.log(query);
      this.auth(req, res);
    },

  'auth' :
    function(req, res) {
      // TODO: Fill in with authorized access behavior.

      // Forward the request to Cayley.
      request.post(
        config.internal_url + ':' + config.internal_port + req.url,
        req.headers['content-type'] === 'application/json' ? { json: req.body } : { body: req.body },
        function (cerror, cresponse, cbody) {
          res.status(cresponse.statusCode).send(cbody);
        }
      );
    }
};
