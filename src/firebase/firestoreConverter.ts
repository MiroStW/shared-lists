import {
  DocumentReference,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { ListData, ItemData, SectionData } from "../types/types";

interface LocalDocumentData<D> {
  ref: DocumentReference<D>;
  data: D;
}

const createFirestoreConverter = <T>(): FirestoreDataConverter<
  LocalDocumentData<T>
> => {
  return {
    toFirestore: (localData: LocalDocumentData<T>) => {
      return localData.data;
    },
    fromFirestore: (
      snapshot: QueryDocumentSnapshot<T>
    ): LocalDocumentData<T> => {
      // const data = snapshot.data(options);
      return {
        ref: snapshot.ref,
        data: snapshot.data(),
      };
    },
  };
};

const listConverter = createFirestoreConverter<ListData>();
const itemConverter = createFirestoreConverter<ItemData>();
const sectionConverter = createFirestoreConverter<SectionData>();

export { itemConverter, listConverter, sectionConverter };
