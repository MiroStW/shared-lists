import {
  DocumentData,
  DocumentReference,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  WithFieldValue,
} from "firebase/firestore";
import * as admin from "firebase-admin/firestore";
import { ListData, ItemData, SectionData, InviteData } from "../types/types";

interface LocalDocumentData<D> {
  ref: DocumentReference<D>;
  data: D;
}

interface LocalAdminDocumentData<D> {
  ref: admin.DocumentReference<D>;
  data: D;
}

const createFirestoreConverter = <T>(): FirestoreDataConverter<
  LocalDocumentData<T>
> => {
  return {
    toFirestore: (
      localData: WithFieldValue<LocalDocumentData<T>>
    ): DocumentData => {
      return localData;
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot): LocalDocumentData<T> => {
      return {
        ref: snapshot.ref as DocumentReference<T>,
        data: snapshot.data() as T,
      };
    },
  };
};

const createAdminFirestoreConverter = <T>(): admin.FirestoreDataConverter<
  LocalAdminDocumentData<T>
> => {
  return {
    toFirestore: (
      localData: admin.WithFieldValue<LocalAdminDocumentData<T>>
    ): DocumentData => {
      return localData;
    },
    fromFirestore: (
      snapshot: admin.QueryDocumentSnapshot
    ): LocalAdminDocumentData<T> => {
      return {
        ref: snapshot.ref as admin.DocumentReference<T>,
        data: snapshot.data() as T,
      };
    },
  };
};

const listConverter = createFirestoreConverter<ListData>();
const adminListConverter = createAdminFirestoreConverter<ListData>();
const itemConverter = createFirestoreConverter<ItemData>();
const sectionConverter = createFirestoreConverter<SectionData>();
const inviteConverter = createFirestoreConverter<InviteData>();

export {
  itemConverter,
  listConverter,
  sectionConverter,
  inviteConverter,
  adminListConverter,
};
