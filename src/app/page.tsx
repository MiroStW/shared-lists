import Link from "next/link";
import { verifyAuthToken } from "./verifyAuthToken";
import SignOutBtn from "./SignOutBtn";
import styles from "../styles/main.module.css";

const getUser = async () => {
  const { user, auth } = await verifyAuthToken();
  console.log("user", user);
  // JSON.stringify(user?.toJSON()); //
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
