#
# Dockerfile that builds Cayley-server for Ubuntu x64.
# Cayley-server maintains an internal Cayley server and a node.js
# server that provides authenticated access to it.
#
# https://github.com/davidp3/cayley-server
#

FROM davidp3/cayley:0.4.1-trunk

MAINTAINER David Parks davidp99@gmail.com

RUN \
  apt-get update

RUN \
  apt-get install -y git

RUN \
  apt-get install -y nodejs

RUN \
  apt-get install -y npm

RUN \
  git clone https://github.com/davidp3/cayley-server.git && \
  cd cayley-server && \
  npm install express body-parser morgan jsonwebtoken

CMD \
  node server.js

EXPOSE 62686

I have a feeling that this should FROM the cayley-docker image, close that guys open port and allow you to connect to it locally only.
How?
