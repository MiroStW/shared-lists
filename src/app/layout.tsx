import "./global.css";
import { SessionContextProvider } from "./sessionContext";

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <SessionContextProvider>{children}</SessionContextProvider>
        <div id="modal"></div>
      </body>
    </html>
  );
};

export default RootLayout;
