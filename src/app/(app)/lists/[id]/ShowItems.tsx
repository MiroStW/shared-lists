"use client";

import { AddButton } from "components/addButton/AddButton";
import { ItemDndContext } from "components/items/ItemDndContext";
import { AdminList } from "types/types";
import { ItemsContextProvider } from "./itemsContext";

const ShowItems = ({ activeList }: { activeList: AdminList }) => {
  return (
    <ItemsContextProvider list={activeList}>
      <ItemDndContext list={activeList} />
      <AddButton activeList={activeList} />
    </ItemsContextProvider>
  );
};

export default ShowItems;
