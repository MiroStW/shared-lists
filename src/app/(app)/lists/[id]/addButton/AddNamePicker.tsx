"use client";

import { Modal } from "app/shared/Modal";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { AdminList } from "types/types";
import { useClientSession } from "app/sessionContext";
import { useLists } from "app/(app)/listsContext";

const AddNamePicker = ({
  activeList,
  type,
  setShowAddMenu,
}: {
  activeList: AdminList;
  type: "item" | "section" | "list";
  setShowAddMenu: Dispatch<SetStateAction<boolean>>;
}) => {
  const { user } = useClientSession();
  const { refreshLists } = useLists();
  const [name, setName] = useState("");
  const router = useRouter();

  const clickHandler = async (
    e: React.MouseEvent<HTMLInputElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (!user) return;

    const finalName = name === "" ? `new ${type}` : name;

    try {
      switch (type) {
        case "list": {
          const response = await fetch("/api/lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: finalName }),
          });
          if (response.ok) {
            const newList = await response.json();
            refreshLists();
            router.push(`/lists/${newList.id}`);
          }
          break;
        }
        case "section": {
          const response = await fetch("/api/sections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: finalName, listId: activeList.id }),
          });
          if (response.ok) {
            // refresh active list details - ideally via a context update
            window.location.reload(); // Simple temp refresh
          }
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error("AddNamePicker Error:", err);
    }

    setShowAddMenu(false);
  };

  return (
    <Modal setOpenModal={setShowAddMenu} title={`New ${type}`} center={true}>
      <form onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="name">Name:</label>
        <input
          autoFocus
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input type="submit" value="Submit" onClick={clickHandler} />
      </form>
    </Modal>
  );
};

export { AddNamePicker };
