import { Timestamp } from "firebase-admin/firestore";
import {
  ListData,
  ItemData,
  SectionData,
  List,
  InviteData,
  AdminList,
} from "../types/types";
import { User } from "next-auth";

const createAdminListData = (name: string, userId: string): ListData => {
  return {
    name,
    createdDate: Timestamp.now(),
    ownerID: userId,
    isArchived: false,
  };
};

const createAdminItemData = ({
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

const createAdminSectionData = ({
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

const createAdminInviteData = (
  user: User,
  inviteeEmail: string,
  list: AdminList
): InviteData => {
  return {
    inviterID: user.id,
    inviterName: user.name || user.email || "unnamed user",
    inviteeEmail,
    listID: list.ref.id,
    listName: list.data.name,
    status: "pending",
    createdDate: Timestamp.now(),
  };
};

export {
  createAdminListData,
  createAdminItemData,
  createAdminSectionData,
  createAdminInviteData,
};
