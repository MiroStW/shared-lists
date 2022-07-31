/* eslint-disable max-classes-per-file */
import { DocumentReference, Timestamp } from "firebase/firestore";

export interface ListData {
  id: string;
  name: string;
  isArchived: boolean;
  createdDate: Timestamp;
  ownerID: string;
}

export class List {
  readonly ref: DocumentReference<ListData>;

  readonly data: ListData;

  constructor(ref: DocumentReference<ListData>, data: ListData) {
    this.ref = ref;
    this.data = data;
  }
}

export interface ItemData {
  id: string;
  name: string;
  isArchived: boolean;
  createdDate: Timestamp;
  ownerID: string;
}

export class Item {
  readonly ref: DocumentReference<ItemData>;

  readonly data: ItemData;

  constructor(ref: DocumentReference<ItemData>, data: ItemData) {
    this.ref = ref;
    this.data = data;
  }
}
