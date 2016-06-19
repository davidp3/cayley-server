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


# To re-fetch latest from the github repo (instead of using cache), add
# `--build-arg='CACHE_DATE=$(date)'` to your `docker build` command.
# (TODO: Switch to a github release tag... when there is one.)
ARG CACHE_DATE=2016-06-01

RUN \
  git clone https://github.com/davidp3/cayley-server.git

CMD \
  cd cayley-server && \
  node server.js
