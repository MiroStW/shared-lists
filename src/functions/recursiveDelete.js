/* eslint-disable @typescript-eslint/no-var-requires */
const { https, logger, region } = require("firebase-functions");
const admin = require("firebase-admin");
const firebaseTools = require("firebase-tools");
// const cors = require("cors")({ origin: true });

/**
 * Initiate a recursive delete of documents at a given path.
 *
 * The calling user must be authenticated
 *
 * This delete is NOT an atomic operation and it's possible
 * that it may fail after only deleting some documents.
 *
 * @param {string} data.path the document or collection path to delete.
 */
exports.recursiveDelete = region("europe-west1")
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .https.onCall(async (data, context) => {
    // Only allow admin users to execute this function.
    if (!context.auth) {
      throw new https.HttpsError(
        "permission-denied",
        "Must be signed in to initiate delete."
      );
    }

    const { path } = data;
    logger.log("path: ", path);

    // Check if user owns the record
    const snapshot = await admin.firestore().doc(path).get();

    if (!snapshot.exists) {
      throw new https.HttpsError("not-found", "Object not found");
    }
    const ownerID = snapshot.get("ownerID");
    logger.log("ownerID: ", ownerID);
    if (ownerID && ownerID !== context.auth.uid) {
      throw new https.HttpsError(
        "permission-denied",
        "Must be list owner to delete."
      );
    }

    const authorizedUsers = snapshot.get("authorizedUsers");
    logger.log("authorizedUsers: ", authorizedUsers);
    if (authorizedUsers && !authorizedUsers.includes(context.auth.uid)) {
      throw new https.HttpsError(
        "permission-denied",
        "Must be authorized to delete."
      );
    }

    if (!authorizedUsers && !ownerID) {
      throw new https.HttpsError(
        "permission-denied",
        "Object to has to be a list or a section."
      );
    }

    console.log(
      `User ${context.auth.uid} has requested to delete path ${path}`
    );

    // Run a recursive delete on the given document or collection path.
    // The 'token' must be set in the functions config, and can be generated
    // at the command line by running 'firebase login:ci'.
    await firebaseTools.firestore.delete(path, {
      project: process.env.GCLOUD_PROJECT,
      recursive: true,
      force: true,
      token: process.env.FB_TOKEN,
    });

    return {
      path,
    };
  });
