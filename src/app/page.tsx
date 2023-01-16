import Link from "next/link";
import { verifyAuthToken } from "./login/verifyAuthToken";
import SignOutBtn from "./SignOutBtn";
import styles from "./main.module.css";

const getUser = async () => {
  const { user, auth } = await verifyAuthToken();
  return { user, auth };
};

const Page = async () => {
  const { user } = await getUser();

  return (
    <>
      <h1>Shared Lists</h1>
      {user && <p>Hi {user.displayName},</p>}
      <p>This is an empty home page, to be filled!</p>
      <div className={styles.loginStatus}>
        {user && (
          <>
            <Link href="/lists">
              <button>open app</button>
            </Link>
            <SignOutBtn />
          </>
        )}
        {!user && (
          <>
            <button>
              <Link href={"/login"}>Login</Link>
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default Page;
