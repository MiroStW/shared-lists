import { Dispatch, SetStateAction } from "react";
import { useLists } from "app/(app)/listsContext";
import { Loading } from "app/shared/Loading";
import { AdminList } from "types/types";
import List from "./List";
import styles from "./lists.module.css";
import { ShowError } from "app/shared/ShowError";

const Lists = ({
  preFetchedLists,
  showMobileLists,
  setShowMobileLists,
}: {
  preFetchedLists?: AdminList[];
  showMobileLists: boolean;
  setShowMobileLists: Dispatch<SetStateAction<boolean>>;
}) => {
  const { lists } = useLists();

  return (
    <div
      className={`${styles.listsArea} ${
        showMobileLists && styles.showMobileLists
      } hoverScrollbar`}
    >
      <div className="listsHeader">
        <h2>Lists</h2>
      </div>
      {
        // render prefetched lists on initial load
        preFetchedLists && lists?.length === 0
          ? preFetchedLists.map((list) => (
              <div key={`pfl${list.ref.id}`}>
                <List list={list} setShowMobileLists={setShowMobileLists} />
              </div>
            ))
          : null
      }
      {
        // listen to lists changes after intial load
        lists &&
          lists.map((list) => (
            <div key={`crl${list.ref.id}`}>
              <List list={list} setShowMobileLists={setShowMobileLists} />
            </div>
          ))
      }
      {lists?.length === 0 && preFetchedLists?.length === 0 && <Loading />}
    </div>
  );
};

export { Lists };
