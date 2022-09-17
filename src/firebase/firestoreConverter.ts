import {
  DocumentData,
  DocumentReference,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  WithFieldValue,
} from "firebase/firestore";
import { ListData, ItemData, SectionData, InviteData } from "../types/types";

interface LocalDocumentData<D> {
  ref: DocumentReference<D>;
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

const listConverter = createFirestoreConverter<ListData>();
const itemConverter = createFirestoreConverter<ItemData>();
const sectionConverter = createFirestoreConverter<SectionData>();
const inviteConverter = createFirestoreConverter<InviteData>();

export { itemConverter, listConverter, sectionConverter, inviteConverter };
