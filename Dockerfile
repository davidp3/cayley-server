#
# Dockerfile that builds Cayley-server for Ubuntu x64.
# Cayley-server maintains an internal Cayley server and a node.js
# server that provides authenticated access to it.
#
# https://github.com/davidp3/cayley-server
#

FROM ubuntu

MAINTAINER David Parks davidp99@gmail.com

RUN \
  apt-get update

RUN \
  apt-get install -y git

RUN \
  apt-get install -y nodejs-legacy

RUN \
  apt-get install -y npm

RUN \
  git clone https://github.com/davidp3/cayley-server.git

RUN \
  npm install node-gyp spdy express request letsencrypt-express body-parser morgan jsonwebtoken bcrypt

CMD \
  cd cayley-server && \
  node server.js

EXPOSE 62686
