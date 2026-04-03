"use client";

import { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { Icon } from "./Icon";

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <Box
      sx={{
        backgroundColor: "#f44336",
        color: "white",
        textAlign: "center",
        py: 0.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transition: "all 0.3s ease-in-out",
      }}
    >
      <Icon iconName="wifi_off" size={20} />
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        You are offline. Changes will sync when you reconnect.
      </Typography>
    </Box>
  );
};

export default OfflineBanner;
