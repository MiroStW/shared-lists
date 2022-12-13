import List from "./List";
import styles from "../../styles/lists.module.css";
import { useLists } from "../../firebase/listsContext";
import { Error } from "../utils/Error";
import { AdminList } from "../../types/types";
import { Loading } from "../utils/Loading";

const Lists = ({ preFetchedLists }: { preFetchedLists?: AdminList[] }) => {
  const { lists, error } = useLists();

  return (
    <div className={styles.listsArea}>
      <div className="listsHeader">
        <h2>Lists</h2>
      </div>
      {error && <Error msg={error.message} />}
      <div className={styles.listList}>
        {
          // render prefetched lists on initial load
          preFetchedLists && lists?.length === 0
            ? preFetchedLists.map((list) => (
                <List key={`pfl${list.ref.id}`} list={list} />
              ))
            : null
        }
        {
          // listen to lists changes after intial load
          lists &&
            lists.map((list) => <List key={`crl${list.ref.id}`} list={list} />)
        }
        {lists?.length === 0 && preFetchedLists?.length === 0 && <Loading />}
      </div>
    </div>
  );
};

export { Lists };
