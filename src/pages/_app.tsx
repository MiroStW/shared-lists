import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { Cookie } from "next-cookie";
import AuthContextProvider from "../firebase/authContext";
import { ListsContextProvider } from "../firebase/listsContext";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Shared Lists</title>
        <meta property="og:title" content="Shared Lists" key="title" />
      </Head>
      <AuthContextProvider cookie={new Cookie()}>
        <ListsContextProvider>
          <Component {...pageProps} />
        </ListsContextProvider>
      </AuthContextProvider>
    </>
  );
}

export default MyApp;
