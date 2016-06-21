TL;DR: cayley-server is a secure, dockerized
way to expose the Cayley graph database from a web server.  It has a
simple visualization client, an demo of which can be found
[here](https://deepdownstudios.com:62686/viz).  (The login name is
"user" and the password is "password").  You can also use the demo
server to experiment with queries (the graph database is
read-only, however).

## Cayley Server

This is a simple Node.js server that authenticates SSH connections
to a local Cayley graph instance and serves authenticated and
unauthenticated responses to server-defined
queries.  This protects the server from DOS attacks by limiting the
queries that can be run.  For example, you can permit simple one-hop
read queries (i.e. queries that go from one user-supplied vertex to
another along a graph edge) in unauthenticated requests and any
HTTP operation (including database writes) for authenticated users.
As authentication is highly insecure without SSL, we allow Let's
Encrypt to optionally secure the server.

The Cayley web interface is not exposed by this server.  In its stead,
I have included a D3.js-powered graph visualizer that you can use to
explore the relationships in the graph.

The handlers are defined in handlers.js.  By changing
`handlers.auth` and `handlers.unauth`, this server can be used for
any purpose and will maintain Let's Encrypt configuration as well as
authentication behavior.

For use with Cayley, you will need to customize the `unauth` handler
to suit your needs but you will probably not need to change
the `auth` handler, which allows any Cayley operation to be run.

## Usage

1. First, you need to launch the backing Cayley instance (and create the
persistent docker volume if not already done).  This is done with
the sister project, [cayley-docker](https://github.com/davidp3/cayley-docker).
We store the Docker container ID for the running instance for step #2.
<br>
Repeating the instructions to launch `cayley-docker`, first we create
a persistent docker volume to hold the database:
```sh
docker volume create --name data_volume
```
Then launch it.  Normally, you will not want to expose `cayley-docker` to the
world as it is not secured.
```sh
CAYLEY_CID=`docker run -v data_volume:/data -d docker.io/davidp3/cayley:0.4.1-trunk`
```
If you wish to expose `cayley-docker` as well as `cayley-server`, forward the port:
```sh
CAYLEY_CID=`docker run -v data_volume:/data -p 64321:64321 -d docker.io/davidp3/cayley:0.4.1-trunk`
```
2. Launch cayley-server.  This can be done with or without Docker.

#### Without Docker

Simply run `node server`.  If using `nodemon` for server development/debugging,
run `nodemon server`.

#### With Docker

The only complex part of this step is the
setting of `CAYLEY_INT_SERVER_IP`, which is done differently for Mac/Windows,
which use `docker-machine`, and Linux, which does not.
<br>
On Windows/Mac, this is the command to launch `cayley-server`:
```sh
docker run -d -v data_volume:/data -p 62686:62686 \
  -e CAYLEY_INT_SERVER_IP=`docker-machine ls | grep tcp | awk '{print $5}' | awk -F/ '{print $3}' | awk -F: '{print $1}'` \
  docker.io/davidp3/cayley-server:0.4.1-trunk
```
The server will be running at the IP address returned by the
`docker-machine ls | awk '{print $5}` command.  This is usually 192.168.99.100.
<br>
On Linux, this is the command:
```sh
docker run -d -v data_volume:/data -p 62686:62686 \
  -e CAYLEY_INT_SERVER_IP=`docker inspect --format '{{ .NetworkSettings.IPAddress }}' $CAYLEY_CID` \
  docker.io/davidp3/cayley-server:0.4.1-trunk
```
You can reach the server at `localhost`.

## The Graph Visualizer

When the server is running, say at `localhost:62686`, the graph visualizer
can be reached with any browser at `localhost:62686/viz`.  There you will
enter the credentials you establish below (or `admin` and `password` if
using the defaults).  This will bring up the full graph in a force-layout
view.  You can drag nodes to rearrange the graph and mouse-over edges
to see the predicate (edge label) that they represent.  A demo
using the default credentials can be found
[here](https://deepdownstudios.com:62686/viz).

Login is required since the query to fetch the entire graph can be expensive
and you may want to hide that data.

## Configuration

### Users

The system uses a basic Json Web Token-based security system with roles for
permissions.  Passwords are stored in `passwords.json` by default
(this location is configurable in `config.js`).  By default, there is a user
named `admin` with password `password` that has admin role and a user
`user` with password `password` who has an `empl` role.  The `admin` role
has total REST access to the graph database.  The `empl` role has only
access to the visualizer.  Unauthorized access has its own REST API
that provides limited query access.

So, to begin with, when you begin to secure your database, you will
want to delete the old password database.

    rm passwords.json

To add a user:

    node caysrvuser <username> <password> <role>

where `role` must be one of the roles in `config.js`.

Removing a user is simply a matter of removing their entry in the JSON file.

### Let's Encrypt

To enable Let's Encrypt, you must set three environment variables:

1. `LEX=1` to turn on Let's Encrypt
2. `LEX_DOMAIN=com.mydomain` must match the name of the domain you are running on/securing.
3. `LEX_EMAIL=com.whatever.me` should be your email address.

You can set up Let's Encrypt any number of ways: through a `certbot` derivative
like the `letsencrypt` client, through a portal, or whatever.  See
[their Getting Started page](https://letsencrypt.org/getting-started/) for
how.  (This could be MUCH clearer...)

Let's Encrypt puts your credentials in any number of places to satisfy myriad
web servers so this may not be obvious for your configuration but most installs
will have these four files easily accessible:

* `chain.pem`
* `fullchain.pem`
* `privkey.pem`
* `cert.pem`

They are often found in `$HOME/letsencrypt/etc/live/{your.secured.domain.name}/`,
`/etc/letsencrypt/live/{your.secured.domain.name}/`,
or some place similar.  These files need to be shared with the Docker instance.
We do that by mounting the folder as another shared volume.
This is done by slightly altering the `docker run` command above (shown here
in the Linux form):
```sh
docker run -d -v data_volume:/data -p 62686:62686 \
  -v {local/path/to/pem/file/folder}:/root/letsencrypt/etc/live/{your.secured.domain.name}/ \
  -e CAYLEY_INT_SERVER_IP=`docker inspect --format '{{ .NetworkSettings.IPAddress }}' $CAYLEY_CID` \
  -e LEX=1 -e LEX_DOMAIN=deepdownstudios.com -e LEX_EMAIL=david@deepdownstudios.com \
  docker.io/davidp3/cayley-server:0.4.1-trunk
```
As an example, if the pem files for my `deepdownstudios.com` domain are
in the `etc` subfolder, I add:

    -v /etc/letsencrypt/live/deepdownstudios.com:/root/letsencrypt/etc/live/deepdownstudios.com/

### Hacking on the server

You may want to change the code in `handlers.unauth` for your personal
use case as described above.

## Docker

To build the Docker image locally for hackin':
```sh
docker build -t davidp3/cayley-server:0.4.1-trunk .
```
This will cache the source from the cayley-server trunk.  To invalidate this
for a rebuild, try:
```sh
docker build --build-arg=CACHE_DATE='`date`' -t davidp3/cayley-server:0.4.1-trunk .
```
