import Link from "next/link";
import SignOutBtn from "./SignOutBtn";
import styles from "./main.module.css";
import verifyIdToken from "auth/verifyIdToken";

const Page = async () => {
  const { user } = await verifyIdToken();

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
              <Link href={"/signin"}>Login</Link>
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default Page;
