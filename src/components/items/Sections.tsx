import { query, where } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { useAuth } from "../../firebase/authContext";
import { itemConverter } from "../../firebase/firestoreConverter";
import { sectionsOfList } from "../../firebase/useDb";
import { List } from "../../types/types";
import { Loading } from "../utils/Loading";
import { Error } from "../utils/Error";
import { Section } from "./Section";

const Sections = ({ list }: { list: List }) => {
  const { user } = useAuth();
  const [sections, loading, error] = useCollection(
    query(
      sectionsOfList(list),
      where("ownerID", "==", user?.uid)
      // orderBy("createdDate", "desc")
    ).withConverter(itemConverter),
    { snapshotListenOptions: { includeMetadataChanges: true } }
  );
  return (
    <>
      {error && <Error msg={error.message} />}
      {loading ? (
        <Loading />
      ) : (
        sections?.docs.map((section) => (
          <Section key={section.ref.id} section={section.data()} />
        ))
      )}
    </>
  );
};

export { Sections };
