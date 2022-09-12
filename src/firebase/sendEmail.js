/* eslint-disable @typescript-eslint/no-var-requires */
const { https } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Listens for new messages added to /messages/:documentId/original and creates an
// uppercase version of the message to /messages/:documentId/uppercase
// exports.makeUppercase = functions.firestore
//   .document("/invites/{documentId}")
//   .onCreate((snap, context) => {
//     // Grab the current value of what was written to Firestore.
//     const { inviterID, inviteeEmail, listID } = snap.data();

//     const invitingUser =
//       // Access the parameter `{documentId}` with `context.params`
//       functions.logger.log("Uppercasing", context.params.documentId, original);

//     const uppercase = original.toUpperCase();

//     // You must return a Promise when performing asynchronous tasks inside a Functions such as
//     // writing to Firestore.
//     // Setting an 'uppercase' field in Firestore document returns a Promise.
//     return snap.ref.set({ uppercase }, { merge: true });
//   });
exports.sendEmail = https.onCall((data, context) => {
  return {
    helloWorld: "hi!",
    data,
    userID: context.auth.uid,
  };
});
