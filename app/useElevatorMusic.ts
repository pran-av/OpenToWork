"use client";

import { useState, useEffect } from "react";

// Shared audio instance across all pages
let sharedAudioInstance: HTMLAudioElement | null = null;
let sharedMusicState = false;

// Initialize shared audio instance only when needed (lazy loading)
function getSharedAudio(): HTMLAudioElement {
  if (!sharedAudioInstance) {
    sharedAudioInstance = new Audio("/elevator-ride-compressed.mp3");
    sharedAudioInstance.loop = true;
    sharedAudioInstance.volume = 1.0;
  }
  return sharedAudioInstance;
}

export function useElevatorMusic() {
  const [isMusicOn, setIsMusicOn] = useState(sharedMusicState);

  // Sync with shared state on mount
  useEffect(() => {
    setIsMusicOn(sharedMusicState);
    
    // If music was already on, ensure audio instance exists and is playing
    if (sharedMusicState && sharedAudioInstance) {
      sharedAudioInstance.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
    }
  }, []);

  const toggleMusic = () => {
    setIsMusicOn((prev) => {
      const newState = !prev;
      sharedMusicState = newState;

      // Only fetch/create audio when user clicks to unmute
      if (newState) {
        // User is turning music ON - fetch audio dynamically
        const audio = getSharedAudio();
        audio.play().catch((error) => {
          console.error("Error playing audio:", error);
        });
      } else {
        // User is turning music OFF - pause if audio exists
        if (sharedAudioInstance) {
          sharedAudioInstance.pause();
        }
      }

      return newState;
    });
  };

  return { isMusicOn, toggleMusic };
}
