import type { NextPage } from "next";
import { useRouter } from "next/router";
import { Loading } from "../../components/utils/Loading";
import { Error } from "../../components/utils/Error";
import { useLists } from "../../firebase/listsContext";

const App: NextPage = () => {
  const router = useRouter();
  const { lists, loading, error } = useLists();

  if (error) return <Error msg={error?.message} />;
  else if (loading) return <Loading />;
  else if (lists) {
    router.push(`/lists/${lists[0].ref.id}`);
  }
  return null;
};

export const getServerSideProps = async () => {
  return {
    props: { protectedRoute: true },
  };
};

export default App;
