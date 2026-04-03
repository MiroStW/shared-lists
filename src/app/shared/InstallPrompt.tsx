"use client";

import { useState, useEffect } from "react";
import { Box, Button, Typography, Snackbar, IconButton } from "@mui/material";
import { Icon } from "./Icon";

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Filter out environments that don't support installation or already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleClose = () => {
    setShowPrompt(false);
  };

  return (
    <Snackbar
      open={showPrompt}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      message={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Icon iconName="download" size={24} />
          <Typography variant="body2">Install Shared Lists for a better experience</Typography>
        </Box>
      }
      action={
        <>
          <Button color="primary" size="small" onClick={handleInstallClick} variant="contained" sx={{ mr: 1 }}>
            Install
          </Button>
          <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
            <Icon iconName="close" size={18} />
          </IconButton>
        </>
      }
      sx={{
        bottom: { xs: 80, sm: 24 }, // Avoid floating action buttons on mobile if any
      }}
    />
  );
};

export default InstallPrompt;
