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

  if (list.contributors?.includes(userId) || list.ownerId === userId) {
    throw new https.HttpsError("already-exists", "User is already authorized");
  }

  const listUpdate = await listRef.update({
    contributors: FieldValue.arrayUnion(userId),
  });
  console.log("list updated? ", listUpdate);

  const subcollections = await listRef.listCollections();
  const itemsRef = await subcollections.find(
    (collection) => collection.id === "items"
  );
  const items = await itemsRef?.get();

  const sectionsRef = await subcollections.find(
    (collection) => collection.id === "sections"
  );
  const sections = await sectionsRef?.get();

  let updatedRecords = 0;

  items?.forEach(async (item) => {
    if (list.contributors) {
      const update = await item.ref.update({
        authorizedUsers: [...list.contributors, list.ownerId, userId],
      });
      if (update) updatedRecords++;
    } else {
      const update = await item.ref.update({
        authorizedUsers: [list.ownerId, userId],
      });
      if (update) updatedRecords++;
    }
  });

  sections?.forEach(async (section) => {
    const update = await section.ref.update({
      authorizedUsers: [...list.contributors, list.ownerId, userId],
    });
    if (update) updatedRecords++;
  });

  return { listId, userId, updatedRecords };
});
