import { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { ListData, ItemData } from "../types/types";

// factory for lists
const createListData = (name: string, user: User): ListData => {
  return {
    name,
    createdDate: Timestamp.now(),
    ownerID: user.uid,
    isArchived: false,
  };
};

// factory for items
const createItemData = (name: string, user: User): ItemData => {
  return {
    name,
    completed: false,
    description: "",
    createdDate: Timestamp.now(),
    ownerID: user.uid,
  };
};

export { createListData, createItemData };
