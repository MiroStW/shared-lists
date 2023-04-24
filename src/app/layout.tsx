import "./global.css";
import ServerAuthContextProvider from "./authContext";
import { verifySession } from "auth/verifySession";

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const { user } = await verifySession();

  console.log("user on root level: ", user?.email);
  const cleanUser = user ? JSON.parse(JSON.stringify(user)) : undefined;

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
