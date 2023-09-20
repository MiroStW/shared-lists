import "./global.css";
import ServerAuthContextProvider from "./authContext";
import verifyIdToken from "auth/verifyIdToken";
import { UserRecord } from "firebase-admin/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import SessionProvider from "./SessionProvider";

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const { user } = await verifyIdToken();
  const session = await getServerSession(authOptions);
  // console.log("session: ", session);

  const cleanUser = user
    ? (JSON.parse(JSON.stringify(user)) as UserRecord)
    : undefined;

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          {/* <ServerAuthContextProvider user={cleanUser}> */}
          {children}
          {/* </ServerAuthContextProvider> */}
        </SessionProvider>
      </body>
    </html>
  );
};

export default RootLayout;
