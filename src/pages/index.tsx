import { signOut } from "firebase/auth";
import type { NextPage } from "next";
import Link from "next/link";
import { useAuth } from "../firebase/authContext";

const Home: NextPage = () => {
  const { user, auth } = useAuth();
  return (
    <>
      <h1>Shared Lists</h1>
      <p>This is an empty home page, to be filled.</p>
      <p>
        {user ? (
          <>
            <Link href="/lists">
              <button>open app</button>
            </Link>
            <button onClick={() => signOut(auth)}>logout</button>
          </>
        ) : (
          <>
            <button>
              <Link href={"/login"}>Login</Link>
            </button>
          </>
        )}
      </p>
    </>
  );
};

export default Home;
