'use client';

import { useEffect, useRef } from 'react';
import { refreshSession } from '@/lib/auth'; // adjust path

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

export default function ActivityProvider({ children }: { children: React.ReactNode }) {
  const lastCalled = useRef(0);

  useEffect(() => {
    const handleActivity = () => {
      const now = Date.now();

      // ⛔ Prevent spamming server (only once every 5 min)
      if (now - lastCalled.current < 20 * 60 * 1000) return;

      lastCalled.current = now;

      refreshSession().catch(() => {
        // silently fail
      });
    };

    EVENTS.forEach(event =>
      window.addEventListener(event, handleActivity)
    );

    return () => {
      EVENTS.forEach(event =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, []);

  return <>{children}</>;
}