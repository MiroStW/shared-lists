import "./global.css";
import ServerAuthContextProvider from "./authContext";
import { verifyAuthToken } from "auth/verifyAuthToken";

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const { user } = await verifyAuthToken();
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
