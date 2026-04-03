import type { Metadata, Viewport } from "next";
import "./global.css";
import { SessionContextProvider } from "./sessionContext";

export const metadata: Metadata = {
  title: "Shared Lists",
  description: "The easiest way to create checklists together.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Shared Lists",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  themeColor: "#ffffff",
};

import OfflineBanner from "./shared/OfflineBanner";
import InstallPrompt from "./shared/InstallPrompt";

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>
        <OfflineBanner />
        <SessionContextProvider>{children}</SessionContextProvider>
        <InstallPrompt />
        <div id="modal"></div>
      </body>
    </html>
  );
};

export default RootLayout;
