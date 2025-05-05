import { useEffect, useState, useRef } from 'react';

const AppWrapper = ({ children }) => {
  const [online, setOnline] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [startCountdown, setStartCountdown] = useState(false);
  const timerRef = useRef(null);

  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    const handleOffline = () => {
      setOnline(false);
      setStartCountdown(true);

      if (isElectron) {
        window.electronAPI.notifyOffline?.();
      }
    };

    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener('offline', handleOffline);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isElectron]);

  useEffect(() => {
    if (!startCountdown) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;

          if (isElectron) {
            window.electronAPI.exitApp?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [startCountdown, isElectron]);

  if (!online) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-6 animate-bounce">🔌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            No Internet Connection
          </h2>
          <p className="text-gray-600 mb-6">
            Please check your connection and try again.
          </p>
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-red-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 3) * 100}%` }}
            ></div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            App will close in{' '}
            <span className="font-bold text-red-500">{countdown}</span> seconds
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AppWrapper;
