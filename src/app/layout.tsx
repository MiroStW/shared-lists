import AuthContextProvider from "./authContext";
import "./global.css";

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body>
        <AuthContextProvider>
          {/* <ListsContextProvider> */}
          {children}
          {/* </ListsContextProvider> */}
        </AuthContextProvider>
      </body>
    </html>
  );
};

export default RootLayout;
