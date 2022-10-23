/* eslint-disable @typescript-eslint/no-var-requires */
const { https } = require("firebase-functions");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.addAuthorizedUser = https.onCall(async (data, context) => {
  const { listId } = data;
  const listRef = admin.firestore().doc(`/lists/${listId}`);
  const userId = context.auth.uid;

  const listSnapshot = await listRef.get();

  if (!listSnapshot.exists) {
    throw new https.HttpsError("not-found", "List not found");
  }

  const list = listSnapshot.data();

  if (list.contributors?.includes(userId) || list.ownerID === userId) {
    throw new https.HttpsError("already-exists", "User is already authorized");
  }

  const listUpdate = await listRef.update({
    contributors: FieldValue.arrayUnion(userId),
  });
  console.log("list updated? ", listUpdate);

  let updatedRecords = 0;

  const subcollections = await listRef.listCollections();

  // update items in top-level list
  const itemsRef = await subcollections.find(
    (collection) => collection.id === "items"
  );
  const items = await itemsRef?.get();

  items?.forEach(async (item) => {
    const update = await item.ref.update({
      authorizedUsers: list.contributors
        ? [...list.contributors, list.ownerID, userId]
        : [list.ownerID, userId],
    });
    if (update) updatedRecords++;
  });

  // update sections in top-level list
  const sectionsRef = await subcollections.find(
    (collection) => collection.id === "sections"
  );
  const sections = await sectionsRef?.get();

  sections?.forEach(async (section) => {
    const update = await section.ref.update({
      authorizedUsers: list.contributors
        ? [...list.contributors, list.ownerID, userId]
        : [list.ownerID, userId],
    });
    if (update) updatedRecords++;

    // update items in sections
    const itemsRef = await section.ref.collection("items").get();
    itemsRef?.forEach(async (item) => {
      const update = await item.ref.update({
        authorizedUsers: list.contributors
          ? [...list.contributors, list.ownerID, userId]
          : [list.ownerID, userId],
      });
      if (update) updatedRecords++;
    });
  });

  return { listId, userId, updatedRecords };
});
