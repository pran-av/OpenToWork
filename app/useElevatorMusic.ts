"use client";

import { useState, useEffect } from "react";

// Shared audio instance across all pages
let sharedAudioInstance: HTMLAudioElement | null = null;
let sharedMusicState = false;

// Initialize shared audio instance
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
  }, []);

  // Handle play/pause based on isMusicOn state
  useEffect(() => {
    const audio = getSharedAudio();
    sharedMusicState = isMusicOn;

    if (isMusicOn) {
      audio.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
    } else {
      audio.pause();
    }
  }, [isMusicOn]);

  const toggleMusic = () => {
    setIsMusicOn((prev) => {
      const newState = !prev;
      sharedMusicState = newState;
      return newState;
    });
  };

  return { isMusicOn, toggleMusic };
}
