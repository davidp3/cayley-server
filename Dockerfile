#
# https://github.com/davidp3/cayley-server
#
# Builds Cayley-server for Ubuntu x64.
# Cayley-server maintains an internal Cayley instance and a node.js
# server that provides authenticated access to it.
# The internal Cayley instance must also be started.  See
# https://github.com/davidp3/cayley-docker
# or the README for this package.
#

FROM ubuntu

MAINTAINER David Parks davidp99@gmail.com

RUN \
  apt-get update && \
  apt-get install -y git && \
  apt-get install -y nodejs-legacy && \
  apt-get install -y npm && \
  npm install node-gyp spdy express request letsencrypt-express body-parser morgan jsonwebtoken bcrypt

RUN \
  git clone https://github.com/davidp3/cayley-server.git && echo e

CMD \
  cd cayley-server && \
  node server.js
