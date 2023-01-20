import { getUser } from "db/getUser";
import { UserRecord } from "firebase-admin/auth";
import { redirect } from "next/navigation";
import "./global.css";
import ServerAuthContextProvider from "./authContext";

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const serializedUser = await getUser();
  if (!serializedUser) redirect("/login");
  const { user } = JSON.parse(serializedUser) as { user: UserRecord };

  return (
    <html lang="en">
      <body>
        <ServerAuthContextProvider user={user}>
          {children}
        </ServerAuthContextProvider>
      </body>
    </html>
  );
};

export default RootLayout;
