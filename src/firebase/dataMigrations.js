/* eslint-disable @typescript-eslint/no-var-requires */
const { region } = require("firebase-functions");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
// const { itemConverter, sectionConverter } = require("./firestoreConverter.ts");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.dataMigrations = region("europe-west3").https.onRequest(
  async (req, res) => {
    const getData = async () => {
      const items = admin
        .firestore()
        .collectionGroup("items")
        .where("ownerID", "!=", null)
        // .withConverter(itemConverter)
        .get();

      const sections = admin
        .firestore()
        .collectionGroup("sections")
        .where("ownerID", "!=", null)
        // .withConverter(sectionConverter)
        .get();

      return {
        items: await items,
        sections: await sections,
      };
    };

    const updateData = async (items, sections) => {
      if (items) {
        items.docs.forEach(async (item) => {
          const addAuthorizedUsersUpdate = await admin
            .firestore()
            .doc(item.ref.path)
            .update({
              authorizedUsers: FieldValue.arrayUnion(item.data().ownerID),
            });

          const deleteOwnerID = await admin
            .firestore()
            .doc(item.ref.path)
            .update({
              ownerID: FieldValue.delete(),
            });
        });
      }

      if (sections) {
        sections.docs.forEach(async (section) => {
          const addAuthorizedUsersUpdate = await admin
            .firestore()
            .doc(section.ref.path)
            .update({
              authorizedUsers: FieldValue.arrayUnion(section.data().ownerID),
            });

          const deleteOwnerID = await admin
            .firestore()
            .doc(section.ref.path)
            .update({
              ownerID: FieldValue.delete(),
            });
        });
      }
    };

    try {
      const { items, sections } = await getData();

      const writeResults = await updateData(items, sections);
      res.status(200).send({ writeResults });
    } catch (error) {
      console.log(error);
      res.status(500).send({ error: error.message });
    }
  }
);
