import type { NextPage } from "next";
import { useRouter } from "next/router";
import { Loading } from "../../components/utils/Loading";
import { Error } from "../../components/utils/Error";
import { useLists } from "../../firebase/listsContext";

const App: NextPage = () => {
  const router = useRouter();
  const { lists, loading: loadingLists, error: errorLists } = useLists();

  if (errorLists) return <Error msg={errorLists?.message} />;
  else if (loadingLists) return <Loading />;
  else if (lists) {
    router.push(`/lists/${lists[0].ref.id}`);
  }
  return null;
};

export default App;
