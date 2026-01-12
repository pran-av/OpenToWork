"use client";

import { useState, useEffect } from "react";
import LinkIdentityDialog from "./LinkIdentityDialog";

interface UserIdentityStatus {
  hasLinkedIn: boolean;
  manualLinkingRejected: boolean;
}

/**
 * Banner component that shows LinkIdentityDialog if:
 * 1. User doesn't have LinkedIn linked
 * 2. User hasn't rejected the manual linking dialog (manual_linking_rejected = false)
 */
export default function LinkIdentityBanner() {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLinkedInStatus();
  }, []);

  const checkLinkedInStatus = async () => {
    try {
      const res = await fetch("/api/auth/link-identity/status");
      if (res.ok) {
        const data: UserIdentityStatus = await res.json();
        // Show dialog if LinkedIn is not linked AND user hasn't rejected the dialog
        if (!data.hasLinkedIn && !data.manualLinkingRejected) {
          setShowDialog(true);
        }
      }
    } catch (error) {
      console.error("Error checking LinkedIn status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    // Mark user as opted out of manual linking
    try {
      await fetch("/api/auth/link-identity/dismiss", {
        method: "POST",
      });
      setShowDialog(false);
    } catch (error) {
      console.error("Error dismissing link identity dialog:", error);
      // Still hide the dialog even if API call fails
      setShowDialog(false);
    }
  };

  const handleLink = () => {
    // Dialog will handle the redirect
    setShowDialog(false);
  };

  if (isLoading || !showDialog) {
    return null;
  }

  return <LinkIdentityDialog onDismiss={handleDismiss} onLink={handleLink} />;
}

