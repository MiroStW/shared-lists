/* eslint-disable @typescript-eslint/no-var-requires */
const { runWith, https, config } = require("firebase-functions");
const admin = require("firebase-admin");
const firebase_tools = require("firebase-tools");
/**
 * Initiate a recursive delete of documents at a given path.
 *
 * The calling user must be authenticated and have the custom "admin" attribute
 * set to true on the auth token.
 *
 * This delete is NOT an atomic operation and it's possible
 * that it may fail after only deleting some documents.
 *
 * @param {string} data.path the document or collection path to delete.
 */
exports.recursiveDelete = runWith({
  timeoutSeconds: 540,
  memory: "2GB",
}).https.onCall(async (data, context) => {
  // Only allow admin users to execute this function.
  if (!context.auth) {
    throw new https.HttpsError(
      "permission-denied",
      "Must be signed in to initiate delete."
    );
  }

  const path = data.path;

  // Check if user owns the record
  const listSnapshot = await admin.firestore().doc(path).get();

  if (!listSnapshot.exists) {
    throw new https.HttpsError("not-found", "List not found");
  }

  if (listSnapshot.data().ownerID !== context.auth.uid) {
    throw new https.HttpsError(
      "permission-denied",
      "Must be list owner to delete."
    );
  }

  console.log(`User ${context.auth.uid} has requested to delete path ${path}`);

  // Run a recursive delete on the given document or collection path.
  // The 'token' must be set in the functions config, and can be generated
  // at the command line by running 'firebase login:ci'.
  await firebase_tools.firestore.delete(path, {
    project: process.env.GCLOUD_PROJECT,
    recursive: true,
    force: true,
    token: config().fb.token,
  });

  return {
    path: path,
  };
});
