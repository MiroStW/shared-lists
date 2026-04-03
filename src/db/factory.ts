import {
  ListData,
  ItemData,
  SectionData,
  List,
  InviteData,
  AdminList,
} from "../types/types";

const createListData = (name: string, userId: string): ListData => {
  return {
    id: "", // Will be set by DB
    name,
    createdDate: new Date().toISOString(),
    ownerID: userId,
    isArchived: false,
  };
};

const createItemData = ({
  name,
  list,
  order = 0,
}: {
  name: string;
  list: List | AdminList;
  order?: number;
}): ItemData => {
  return {
    id: "", // Will be set by DB
    name,
    completed: false,
    description: "",
    createdDate: new Date().toISOString(),
    order,
    listID: list.id,
  };
};

const createSectionData = ({
  name,
  listId,
}: {
  name: string;
  listId: string;
}): SectionData => {
  return {
    id: "", // Will be set by DB
    name,
    createdDate: new Date().toISOString(),
    listId,
  };
};

const createInviteData = (
  userId: string,
  userName: string,
  inviteeEmail: string,
  list: AdminList
): InviteData => {
  return {
    id: "", // Will be set by DB
    inviterID: userId,
    inviterName: userName,
    inviteeEmail,
    listID: list.id,
    listName: list.data.name,
    status: "pending",
    createdDate: new Date().toISOString(),
  };
};

export { createListData, createItemData, createSectionData, createInviteData };
