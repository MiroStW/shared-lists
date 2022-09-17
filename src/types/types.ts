/* eslint-disable max-classes-per-file */
import { DocumentReference, Timestamp } from "firebase/firestore";

export interface ListData {
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

export interface SectionData {
  name: string;
  createdDate: Timestamp;
  ownerID: string;
}

export class Section {
  readonly ref: DocumentReference<SectionData>;

  readonly data: SectionData;

  constructor(ref: DocumentReference<SectionData>, data: SectionData) {
    this.ref = ref;
    this.data = data;
  }
}

export interface ItemData {
  name: string;
  completed: boolean;
  description: string;
  createdDate: Timestamp;
  ownerID: string;
  order: number;
  list: string;
}

export class Item {
  readonly ref: DocumentReference<ItemData>;

  readonly data: ItemData;

  constructor(ref: DocumentReference<ItemData>, data: ItemData) {
    this.ref = ref;
    this.data = data;
  }
}

export interface InviteData {
  inviterID: string;
  inviterName: string;
  inviteeEmail: string;
  listID: string;
  listName: string;
  status: "pending" | "accepted" | "declined";
  createdDate: Timestamp;
}

export class Invite {
  readonly ref: DocumentReference<InviteData>;

  readonly data: InviteData;

  constructor(ref: DocumentReference<InviteData>, data: InviteData) {
    this.ref = ref;
    this.data = data;
  }
}
