"use client";

import { useAuth } from "app/authContext";
import { AddButton } from "app/(app)/lists/[id]/addButton/AddButton";
import { ItemDndContext } from "app/(app)/lists/[id]/items/ItemDndContext";
import { AdminList } from "types/types";
import { ItemsContextProvider } from "./itemsContext";

const ShowItems = ({ activeList }: { activeList: AdminList }) => {
  const { user } = useAuth();

  return (
    <>
      {user && (
        <ItemsContextProvider list={activeList} user={user}>
          <ItemDndContext list={activeList} />
          <AddButton activeList={activeList} />
        </ItemsContextProvider>
      )}
    </>
  );
};

export default ShowItems;
