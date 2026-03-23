import { useEffect, useRef } from 'react';

export const useWakeLock = (active) => {
        const wakeLockRef = useRef(null);
        useEffect(() => {
            const requestLock = async () => {
                if ('wakeLock' in navigator && active) {
                    try {
                        wakeLockRef.current = await navigator.wakeLock.request('screen');
                    } catch (err) {
                        console.log('Wake Lock request failed:', err);
                    }
                }
            };
            const releaseLock = async () => {
                if (wakeLockRef.current) {
                    await wakeLockRef.current.release();
                    wakeLockRef.current = null;
                }
            };
            if (active) requestLock();
            else releaseLock();
            const handleVisChange = () => {
                if (document.visibilityState === 'visible' && active) requestLock();
            };
            document.addEventListener('visibilitychange', handleVisChange);
            return () => {
                releaseLock();
                document.removeEventListener('visibilitychange', handleVisChange);
            };
        }, [active]);
    };

    