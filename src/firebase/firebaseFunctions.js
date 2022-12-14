/* eslint-disable import/no-unresolved */
/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
const { region } = require("firebase-functions");
const { default: next } = require("next");
const sendEmail = require("./sendEmail");
const addAuthorizedUser = require("./addAuthorizedUser");
const dataMigrations = require("./dataMigrations");
const recursiveDelete = require("./recursiveDelete");
const nextConfig = require("../../next.config.js");

const nextjsServer = next({
  dev: false,
  conf: nextConfig,
  // {
  //   distDir: require("../../next.config.js").distDir,
  // },
});

const nextjsHandle = nextjsServer.getRequestHandler();

exports.nextjsFunc = region("europe-west1")
  .runWith({ minInstances: 1 })
  .https.onRequest((req, res) => {
    return nextjsServer.prepare().then(() => nextjsHandle(req, res));
  });

exports.sendEmail = sendEmail.sendEmail;
exports.addAuthorizedUser = addAuthorizedUser.addAuthorizedUser;
exports.dataMigrations = dataMigrations.dataMigrations;
exports.recursiveDelete = recursiveDelete.recursiveDelete;
