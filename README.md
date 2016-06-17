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
As authentication is highly insecure without SSL, we allow Let's
Encrypt to optionally secure the server.

The Cayley web interface is not exposed by this server.

The handlers are defined in handlers.js.  By changing
`handlers.auth` and `handlers.unauth`, this server can be used for
any purpose and will maintain Let's Encrypt configuration as well as
authentication behavior.

For use with Cayley, you will need to customize the `unauth` handler
to suit your needs but you will probably not need to change
the `auth` handler, which allows any Cayley operation to be run.

## Usage

1. First, you need to launch the backing Cayley instance (and create the
persistent docker volume if not already done):
```sh
docker volume create --name data_volume
docker run -v data_volume:/data -p 64321:64321 -d davidp3/cayley:0.4.1-trunk
```
See [cayley-docker](https://github.com/davidp3/cayley-docker) for more info.
2. Next, if you are running on a platform other than Linux, the backing Cayley
instance will not be found at localhost so you need to find the URL, which
can be obtained by running `docker-machine` after
starting `cayley-docker`:
```sh
docker-machine ls | awk '{print $5}'
```
It will probably be `192.168.99.100`.  On Linux, you can use the default of
`localhost`.
3. Finally, launch cayley-server:
```sh
docker run -d -v data_volume:/data -p 62686:62686 -e CAYLEY_INT_SERVER_IP=<my_internal_docker_ip> davidp3/cayley-server:0.4.1-trunk
```
Again, on a Linux host, you can omit the
`-e CAYLEY_INT_SERVER_IP=<my_internal_docker_ip>` part.

## Configuration

You should definitely set these environment vars using `-e` switches to
the `docker run` command:

1. `CAYLEY_USERNAME=myusername` is the (only) name you can log in with.  The
default is `admin`.
2. `CAYLEY_BCRYPT_PASSWD=my_bcrypted_password` must be the hash of the password you
log in with.  The default is a hash of `password`.
I haven't found a decent way to generate the hash` without using the
javascript function used in this package.  There are working Python and Perl solutions
[here](http://unix.stackexchange.com/questions/52108/how-to-create-sha512-password-hashes-on-command-line)...
they all kind of suck.

To enable Let's Encrypt, you must set three environment variables:

1. `LEX=1` to turn on Let's Encrypt
2. `LEX_DOMAIN=com.mydomain` must match the name of the domain you are running on/securing.
3. `LEX_EMAIL=com.whatever.me` should be your email address.

Finally, you will likely want to change the code in `handlers.unauth` for your
use case as described above.

## Docker

To build the Docker image locally for hackin':
```sh
docker build -t davidp3/cayley-server:0.4.1-trunk .
```
