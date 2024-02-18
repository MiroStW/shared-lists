import Link from "next/link";
import styles from "./main.module.css";
import SignOutBtn from "./SignOutBtn";
import SignInBtn from "./SignInBtn";
import { getServerSession } from "auth/getServerSession";

const Page = async () => {
  const { user } = await getServerSession();

  return (
    <>
      <h1>Shared Lists</h1>
      {user && (
        <p>
          Hi {user.displayName}, your ID is {user.uid}
        </p>
      )}
      <p>This is an empty home page, to be filled!</p>
      <div className={styles.loginStatus}>
        {user ? (
          <>
            <Link href="/lists">
              <button>open app</button>
            </Link>
            <SignOutBtn />
          </>
        ) : (
          <>
            <SignInBtn />
          </>
        )}
      </div>
    </>
  );
};

export default Page;
