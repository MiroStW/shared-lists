import List from "./List";
import styles from "../../styles/lists.module.css";
import { useLists } from "../../firebase/listsContext";
import { Error } from "../utils/Error";

const Lists = () => {
  const { lists, error } = useLists();

  return (
    <div className={styles.listsArea}>
      <div className="listsHeader">
        <h2>Lists</h2>
      </div>
      {error && <Error msg={error.message} />}
      <div className={styles.listList}>
        {lists?.map((list) => {
          return <List key={list.ref.id} list={list} />;
        })}
      </div>
    </div>
  );
};

export { Lists };
