var request     = require('request');
var path        = require('path');
var config      = require('./config')

const ALL_TAG = '__ALL__';
const QUERY_PATH = '/api/v1/query/gremlin';

module.exports = {
  'unauth' :
    function(req, res) {
      // USER TODO: Fill in with your desired unauthorized access behavior.

      // If the request is to '/viz' then show my graph visualization
      // (I haven't been able to get the Cayley visualizations to work).
      if (req.url === '/viz') {
        this.auth(req, res);
        return;
      }

      // http://icons8.com
      const files = [ 'question.ico', 'd3-tip.js', 'max.ico', 'min.ico' ];
      if (files.indexOf(req.url.substring(1)) != -1) {
        res.sendFile(req.url.substring(1), { root: __dirname });
        return;
      }

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
      req.url = QUERY_PATH;
      req.body = query;
      req.headers['content-type'] = 'text/plain';
      console.log(query);
      this.auth(req, res);
    },

  'auth' :
    function(req, res) {
      // USER TODO: Fill in with your desired authorized access behavior.

      // If the request is to '/viz' then show my graph visualization
      // (I haven't been able to get the Cayley visualizations to work).
      if (req.url === '/viz') {
        res.sendFile('index.html', { root: __dirname });
        return;
      }

      // Forward the request to Cayley.
      request.post(
        "http://" + config.internal_url + ':' + config.internal_port + req.url,
        req.headers['content-type'] === 'application/json' ? { json: req.body } : { body: req.body },
        function (cerror, cresponse, cbody) {
          if (!cresponse) {
            console.log("Failed to contact Cayley instance.  Error: " + cbody);
          }
          if (cresponse && cresponse.statusCode !== 200) {
            console.log("Cayley returned error: " + cbody);
          }
          res.status(cresponse ? cresponse.statusCode : 404).send(cbody);
        }
      );
    }
};
