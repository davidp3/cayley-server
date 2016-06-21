var request     = require('request');
var path        = require('path');
var config      = require('./config')

const ALL_TAG = '__ALL__';
const QUERY_PATH = '/api/v1/query/gremlin';
// This GremlinJS script will query the entire database AND return it
// in a format that D3's force layout can understand.
// BEWARE: New-lines are lost when writing strings like this so remember, at least,
// to use old C-style comments only, as well as statement-ending semi-colons.
const FETCH_GRAPH =
  "var verts = g.V().ToArray(); \
    var verts = verts.map(function(o) { return { 'name' : o } }); \
    var edges = []; \
    var vertIdxMap = {}; \
    for (var i=0; i<verts.length; i++) { \
      vertIdxMap[verts[i].name] = i; \
    } \
    for (var i=0; i<verts.length; i++) { \
      var vert = verts[i];  \
      /* If there are no outgoing edges then result will be null. */ \
      var new_edges = []; \
      g.V(vert.name).Out(null,'pred') \
        .Map(function(o) {  \
          new_edges.push( { 'source' : i, 'target' : vertIdxMap[o.id], 'pred' : o.pred } )  \
        }); \
      if (new_edges) { \
        edges = edges.concat(new_edges);  \
      } \
    } \
    g.Emit({ 'nodes' : verts, 'links' : edges })";

module.exports = {
  'unauth' :
    function(req, res) {
      // USER TODO: Fill in with your desired unauthorized access behavior.

      // If the request is to '/viz' then show my graph visualization.
      // The user hasn't had the opportunity to log in yet.
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
      req.decoded.role = "admin";
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

      if (req.url === '/viz/graph') {
        req.headers['content-type'] = 'text/plain';
        req.body = FETCH_GRAPH;
        req.url = QUERY_PATH;
        req.decoded.role = 'admin';
      }

      // Anyone not 'admin' (for example, 'empl's) cannot use features beyond
      // this point.
      if (req.decoded.role !== 'admin') {
        res.status(404).send('Insufficient permission for request.');
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
