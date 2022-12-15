import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Cookie } from "next-cookie";
import AuthContextProvider from "../firebase/authContext";
import { ListsContextProvider } from "../firebase/listsContext";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthContextProvider cookie={new Cookie()}>
      <ListsContextProvider>
        <Component {...pageProps} />
      </ListsContextProvider>
    </AuthContextProvider>
  );
}

export default MyApp;
