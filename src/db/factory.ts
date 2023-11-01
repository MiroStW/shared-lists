import { Timestamp } from "firebase/firestore";
import {
  ListData,
  ItemData,
  SectionData,
  List,
  InviteData,
  AdminList,
} from "../types/types";
import { User } from "firebase/auth";

const createListData = (name: string, userId: string): ListData => {
  return {
    name,
    createdDate: Timestamp.now(),
    ownerID: userId,
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
  list: List | AdminList;
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

const createSectionData = ({
  name,
  authorizedUsers,
}: {
  name: string;
  authorizedUsers: string[];
}): SectionData => {
  return {
    name,
    createdDate: Timestamp.now(),
    authorizedUsers,
  };
};

const createInviteData = (
  user: User,
  inviteeEmail: string,
  list: AdminList
): InviteData => {
  return {
    inviterID: user.uid,
    inviterName: user.displayName || user.email || "unnamed user",
    inviteeEmail,
    listID: list.ref.id,
    listName: list.data.name,
    status: "pending",
    createdDate: Timestamp.now(),
  };
};

export { createListData, createItemData, createSectionData, createInviteData };
