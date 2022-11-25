import { useRouter } from "next/router";
import { GetServerSidePropsContext } from "next";
import { Loading } from "../../components/utils/Loading";
import { Error } from "../../components/utils/Error";
import { useLists } from "../../firebase/listsContext";
import { verifyAuthToken } from "../../firebase/verifyAuthToken";

// TODO delete protectedRoute component

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { serializedUser } = await verifyAuthToken(ctx);

  // TODO directly redirect to /lists/[id] if user is logged in
  if (serializedUser)
    return {
      props: {
        serializedUser,
      },
    };
  else
    return {
      redirect: {
        permanent: false,
        destination: "/login",
      },
      props: {} as never,
    };
};

const App = () => {
  const router = useRouter();
  const { lists, loading, error } = useLists();

  if (error) return <Error msg={error?.message} />;
  else if (loading) return <Loading />;
  else if (lists) {
    router.push(`/lists/${lists[0]?.ref.id}`);
  }
  return null;
};

export default App;
