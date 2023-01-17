import { UserRecord } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import {
  ListData,
  ItemData,
  SectionData,
  List,
  InviteData,
  AdminList,
} from "../types/types";

const createAdminListData = (name: string, user: UserRecord): ListData => {
  return {
    name,
    createdDate: Timestamp.now(),
    ownerID: user.uid,
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
  user: UserRecord,
  inviteeEmail: string,
  list: AdminList
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

export {
  createAdminListData,
  createAdminItemData,
  createAdminSectionData,
  createAdminInviteData,
};
