import "./global.css";
import ServerAuthContextProvider from "./authContext";
import verifyIdToken from "auth/verifyIdToken";
import { UserRecord } from "firebase-admin/auth";

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const { user } = await verifyIdToken();

  const cleanUser = user
    ? (JSON.parse(JSON.stringify(user)) as UserRecord)
    : undefined;

  return (
    <html lang="en">
      <body>
        <ServerAuthContextProvider user={cleanUser}>
          {children}
        </ServerAuthContextProvider>
      </body>
    </html>
  );
};

export default RootLayout;
