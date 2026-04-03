import Link from "next/link";
import styles from "./main.module.css";
import SignOutBtn from "./SignOutBtn";
import SignInBtn from "./SignInBtn";
import getServerSession from "auth/getServerSession";

const Page = async () => {
  const session = await getServerSession();
  const user = 'user' in session ? session.user : null;

  return (
    <>
      <h1>Shared Lists</h1>
      {user && (
        <p>
          Hi {user.name || user.email}, your ID is {user.id}
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
