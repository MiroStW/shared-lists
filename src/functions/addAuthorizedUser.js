/* eslint-disable @typescript-eslint/no-var-requires */
const { https, region } = require("firebase-functions");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

if (!admin.apps.length) {
  admin.initializeApp();
}
const updateRecords = async (userId, listRef) => {
  const listSnapshot = await listRef.get();

  if (!listSnapshot.exists) {
    throw new https.HttpsError("not-found", "List not found");
  }

  const list = listSnapshot.data();

  if (list.contributors?.includes(userId) || list.ownerID === userId) {
    throw new https.HttpsError(
      "already-exists",
      "You already joined this list"
    );
  }

  try {
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
      const updateItems = await item.ref.update({
        authorizedUsers: list.contributors
          ? [...list.contributors, list.ownerID, userId]
          : [list.ownerID, userId],
      });
      if (updateItems) updatedRecords += 1;
    });

    // update sections in top-level list
    const sectionsRef = await subcollections.find(
      (collection) => collection.id === "sections"
    );
    const sections = await sectionsRef?.get();

    sections?.forEach(async (section) => {
      const updateSections = await section.ref.update({
        authorizedUsers: list.contributors
          ? [...list.contributors, list.ownerID, userId]
          : [list.ownerID, userId],
      });
      if (updateSections) updatedRecords += 1;

      // update items in sections
      const sectionItemsRef = await section.ref.collection("items").get();
      sectionItemsRef?.forEach(async (item) => {
        const updateSectionItems = await item.ref.update({
          authorizedUsers: list.contributors
            ? [...list.contributors, list.ownerID, userId]
            : [list.ownerID, userId],
        });
        if (updateSectionItems) updatedRecords += 1;
      });
      console.log("updated records: ", updatedRecords);
    });
  } catch (error) {
    console.error(error);
    throw new https.HttpsError("unknown", "Something went wrong");
  }
};

exports.addauthorizeduser = region("europe-west1").https.onCall(
  async (data, context) => {
    const { listId } = data;
    const listRef = admin.firestore().doc(`/lists/${listId}`);
    // console.log(JSON.stringify(context, null, 4));
    const userId = context.auth.uid;

    return updateRecords(userId, listRef);
  }
);
