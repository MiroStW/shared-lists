import Link from "next/link";
import styles from "./main.module.css";
import { getServerSession } from "next-auth";
import SignOutBtn from "./SignOutBtn";
import SignInBtn from "./SignInBtn";
import { authOptions } from "./api/auth/[...nextauth]/route";

const Page = async () => {
  const user = (await getServerSession(authOptions))?.user;

  return (
    <>
      <h1>Shared Lists</h1>
      {user && (
        <p>
          Hi {user.name}, your ID is {user.id}
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
