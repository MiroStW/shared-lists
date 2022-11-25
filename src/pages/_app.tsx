import "../styles/globals.css";
import type { AppProps } from "next/app";
import { AuthContextProvider } from "../firebase/authContext";
import { ListsContextProvider } from "../firebase/listsContext";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthContextProvider>
      <ListsContextProvider>
        <Component {...pageProps} />
      </ListsContextProvider>
    </AuthContextProvider>
  );
}

export default MyApp;
