"use strict";

function createMediaController({ twilioMediaProxy }) {
  return {
    proxyMedia(req, res) {
      twilioMediaProxy.handleMediaProxyRequest(req, res);
    }
  };
}

module.exports = {
  createMediaController
};
