/* eslint-disable import/no-unresolved */
/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
const { https } = require("firebase-functions");
const { default: next } = require("next");
const sendEmail = require("./sendEmail");

const nextjsServer = next({
  dev: false,
  conf: {
    distDir: require("../../next.config.js").distDir,
  },
});

const nextjsHandle = nextjsServer.getRequestHandler();

exports.nextjsFunc = https.onRequest((req, res) => {
  return nextjsServer.prepare().then(() => nextjsHandle(req, res));
});

exports.sendEmail = sendEmail.sendEmail;
