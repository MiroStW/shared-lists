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
  const { lists, error } = useLists();

  return (
    <div
      className={`${styles.listsArea} ${
        showMobileLists && styles.showMobileLists
      }`}
    >
      <div className="listsHeader">
        <h2>Lists</h2>
      </div>
      {error && <ShowError msg={error.message} />}
      {
        // render prefetched lists on initial load
        preFetchedLists && lists?.length === 0
          ? preFetchedLists.map((list) => (
              <div
                onClick={() => setShowMobileLists(false)}
                key={`pfl${list.ref.id}`}
              >
                <List list={list} />
              </div>
            ))
          : null
      }
      {
        // listen to lists changes after intial load
        lists &&
          lists.map((list) => (
            <div
              onClick={() => setShowMobileLists(false)}
              key={`crl${list.ref.id}`}
            >
              <List list={list} />
            </div>
          ))
      }
      {lists?.length === 0 && preFetchedLists?.length === 0 && <Loading />}
    </div>
  );
};

export { Lists };
