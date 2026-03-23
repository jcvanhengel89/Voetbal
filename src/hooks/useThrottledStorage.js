import { useState, useEffect, useRef, useCallback } from 'react';

export const useThrottledStorage = (key, initialValue, throttleMs = 5000) => {
        const [state, setState] = useState(() => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : initialValue;
            } catch {
                return initialValue;
            }
        });
        const lastSaveRef = useRef(Date.now());
        const timeoutRef = useRef(null);
        const stateRef = useRef(state);

        useEffect(() => { stateRef.current = state; }, [state]);

        const saveNow = useCallback(() => {
            try {
                localStorage.setItem(key, JSON.stringify(stateRef.current));
                lastSaveRef.current = Date.now();
            } catch (e) { console.error("Storage save failed", e); }
        }, [key]);

        useEffect(() => {
            const now = Date.now();
            const timeSinceLastSave = now - lastSaveRef.current;
            if (timeSinceLastSave > throttleMs) {
                saveNow();
            } else {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(saveNow, throttleMs);
            }
            return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
        }, [state, throttleMs, saveNow]);

        useEffect(() => {
            const handleVisibilityChange = () => {
                if (document.visibilityState === 'hidden') saveNow();
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);
            return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
        }, [saveNow]);

        return [state, setState];
    };

    // --------------------------------------------------------------------
    // HELPERS & ICONS
    // --------------------------------------------------------------------
    
    