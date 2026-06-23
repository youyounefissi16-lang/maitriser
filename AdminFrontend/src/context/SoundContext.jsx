import React, { createContext, useContext, useCallback, useRef } from 'react';
import { playSound } from '../utils/sound';

const SoundContext = createContext(null);

export const useSound = () => useContext(SoundContext);

export const SoundProvider = ({ children }) => {
  const enabledRef = useRef(() => { try { return localStorage.getItem('soundEnabled') !== 'false'; } catch { return true; } });

  const play = useCallback((type) => {
    if (enabledRef.current()) playSound(type);
  }, []);

  return <SoundContext.Provider value={play}>{children}</SoundContext.Provider>;
};
