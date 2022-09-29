import { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import {
  ListData,
  ItemData,
  SectionData,
  List,
  InviteData,
} from "../types/types";

const createListData = (name: string, user: User): ListData => {
  return {
    name,
    createdDate: Timestamp.now(),
    ownerID: user.uid,
    isArchived: false,
  };
};

const createItemData = ({
  name,
  authorizedUsers,
  list,
  order = 0,
}: {
  name: string;
  authorizedUsers: string[];
  list: List;
  order?: number;
}): ItemData => {
  return {
    name,
    completed: false,
    description: "",
    createdDate: Timestamp.now(),
    authorizedUsers,
    order,
    list: list.ref.id,
  };
};

const createSectionData = (name: string, user: User): SectionData => {
  return {
    name,
    createdDate: Timestamp.now(),
    ownerID: user.uid,
  };
};

const createInviteData = (
  user: User,
  inviteeEmail: string,
  list: List
): InviteData => {
  return {
    inviterID: user.uid,
    inviterName: user.displayName || user.email!,
    inviteeEmail,
    listID: list.ref.id,
    listName: list.data.name,
    status: "pending",
    createdDate: Timestamp.now(),
  };
};

export { createListData, createItemData, createSectionData, createInviteData };
