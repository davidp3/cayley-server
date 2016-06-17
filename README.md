WIP.

## Cayley Server

This is a simple Node.js server that authenticates SSH connections
to a local Cayley graph instance and serves authenticated and
unauthenticated responses to server-defined
queries.  This protects the server from DOS attacks by limiting the
queries that can be run.  For example, you can permit simple one-hop
read queries (i.e. queries that go from one user-supplied vertex to
another along a graph edge) in unauthenticated requests and any
HTTP operation (including database writes) for authenticated users.

The Cayley web interface is not exposed by this server.
