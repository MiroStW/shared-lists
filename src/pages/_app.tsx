import "../styles/globals.css";
import type { AppProps } from "next/app";
import { AuthContextProvider } from "../firebase/authContext";
import { ListsContextProvider } from "../firebase/listsContext";
import { ProtectedRoute } from "../components/utils/ProtectedRoute";

export interface RouteProps {
  protectedRoute: boolean;
}

interface AppPropsProtectedRoute extends AppProps {
  pageProps: RouteProps;
}

function MyApp({ Component, pageProps }: AppPropsProtectedRoute) {
  return (
    <AuthContextProvider>
      <ListsContextProvider>
        {pageProps.protectedRoute ? (
          <ProtectedRoute>
            <Component {...pageProps} />
          </ProtectedRoute>
        ) : (
          <Component {...pageProps} />
        )}
      </ListsContextProvider>
    </AuthContextProvider>
  );
}

export default MyApp;
