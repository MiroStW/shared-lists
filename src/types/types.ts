export interface UserData {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
}

export interface ListData {
  id: string;
  name: string;
  isArchived: boolean;
  createdDate: Date | string;
  ownerID: string;
  owner?: UserData;
  contributors?: UserData[];
}

export interface SectionData {
  id: string;
  name: string;
  createdDate: Date | string;
  listId: string;
}

export interface ItemData {
  id: string;
  name: string;
  completed: boolean;
  description: string;
  createdDate: Date | string;
  order: number;
  listID: string;
  sectionID?: string | null;
}

export interface InviteData {
  id: string;
  inviterID: string;
  inviterName: string;
  inviteeEmail: string;
  listID: string;
  listName: string;
  status: "pending" | "accepted" | "declined";
  createdDate: Date | string;
}

// Compatibility types to minimize refactoring effort in components
export type List = {
  id: string;
  data: ListData;
};

export type Section = {
  id: string;
  data: SectionData;
};

export type Item = {
  id: string;
  data: ItemData;
};

export type Invite = {
  id: string;
  data: InviteData;
};

export type AdminList = List;
export type AdminInvite = Invite;
