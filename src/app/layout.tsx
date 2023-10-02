import "./global.css";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import SessionProvider from "./SessionProvider";
import { AuthContextProvider } from "./authContext";

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          <AuthContextProvider>{children}</AuthContextProvider>
        </SessionProvider>
      </body>
    </html>
  );
};

export default RootLayout;
