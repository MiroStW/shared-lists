import {
  getFirestore,
  CollectionReference,
  collection,
  DocumentData,
  collectionGroup,
  connectFirestoreEmulator,
  enableMultiTabIndexedDbPersistence,
} from "firebase/firestore";
// import { useSnackbar } from "components/helpers/snackbar/snackbar";
import {
  InviteData,
  ItemData,
  List,
  ListData,
  Section,
  SectionData,
} from "../types/types";
import { firebase } from "./firebase";

export const db = getFirestore(firebase);

// comment out this line to switch to production db
connectFirestoreEmulator(db, "localhost", 8080);

// enableMultiTabIndexedDbPersistence(db);
//   .catch((err) => {
//   if (err.code === "failed-precondition") {
//     useSnackbar("please don't open multiple tabs", "red");
//   } else if (err.code === "unimplemented") {
//     useSnackbar("browser does not support offline mode", "red");
//   }
// });

// This is just a helper to add the type to the db responses
const createCollection = <T = DocumentData>(collectionName: string) => {
  return collection(db, collectionName) as CollectionReference<T>;
};
const createCollectionGroup = <T = DocumentData>(collectionName: string) => {
  return collectionGroup(db, collectionName) as CollectionReference<T>;
};

// export all collections
export const lists = createCollection<ListData>("lists");
export const items = createCollectionGroup<ItemData>("items");
export const sections = createCollectionGroup<SectionData>("sections");
export const itemsOfList = (list: List) =>
  createCollection<ItemData>(`lists/${list.ref.id}/items`);

export const sectionsOfList = (list: List) =>
  createCollection<SectionData>(`lists/${list.ref.id}/sections`);

export const itemsOfSection = (section: Section) =>
  createCollection<ItemData>(
    `lists/${section.ref.parent.parent?.id}/sections/${section.ref.id}/items`
  );

export const invites = createCollection<InviteData>("invites");
