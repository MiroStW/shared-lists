"use client";

import { AddButton } from "app/(app)/lists/[id]/addButton/AddButton";
import { ItemDndContext } from "app/(app)/lists/[id]/items/ItemDndContext";
import { AdminList } from "types/types";
import { ItemsContextProvider } from "./itemsContext";
import { UserRecord } from "firebase-admin/auth";

const ShowItems = ({
  activeList,
  user,
}: {
  activeList: AdminList;
  user: UserRecord;
}) => {
  return (
    <>
      <ItemsContextProvider list={activeList} user={user}>
        <ItemDndContext list={activeList} />
        <AddButton activeList={activeList} />
      </ItemsContextProvider>
    </>
  );
};

export default ShowItems;
