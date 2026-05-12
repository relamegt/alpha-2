import { useState, useEffect } from 'react';

export const useIDEHealth = () => {
  const [status, setStatus] = useState({ isRunning: null, ideUrl: 'http://localhost' });

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      // Try port 80 first
      try {
        await fetch('http://localhost/', { mode: 'no-cors', cache: 'no-cache' });
        if (isMounted) setStatus({ isRunning: true, ideUrl: 'http://localhost' });
        return;
      } catch (err) {
        // Fallback check on 8080
        try {
          await fetch('http://localhost:8080/', { mode: 'no-cors', cache: 'no-cache' });
          if (isMounted) setStatus({ isRunning: true, ideUrl: 'http://localhost:8080' });
          return;
        } catch (err2) {
          if (isMounted) setStatus({ isRunning: false, ideUrl: 'http://localhost' });
        }
      }
    };

    // Initial check
    check();

    // Poll every 5s
    const interval = setInterval(check, 5000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return status;
};
