import { useEffect, useState, useRef } from 'react';
import { WifiOff } from 'lucide-react';

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
    const handleSuspend = () => {
      setOnline(false);
      setStartCountdown(true);
      if (isElectron) {
        window.electronAPI.notifyOffline?.();
      }
    };

    if (isElectron && window.electronAPI?.onSuspend) {
      window.electronAPI.onSuspend?.(handleSuspend);
    }

    return () => {
      if (isElectron && window.electronAPI?.removeSuspendListener) {
        window.electronAPI.removeSuspendListener?.(handleSuspend);
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-lg border border-blue-100">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-px bg-blue-500 w-full"
                  style={{
                    top: `${i * 20}%`,
                    left: 0,
                    animation: `pulse ${1 + i * 0.2}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </div>

            <div className="p-8 relative">
              <div className="mx-auto w-20 h-20 mb-6 rounded-full bg-red-100 flex items-center justify-center">
                <WifiOff className="text-red-500" size={36} />
              </div>

              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                No Internet Connection
              </h2>

              <p className="text-gray-600 text-center mb-8">
                We're having trouble connecting to the network. Please wait
                while we attempt to reconnect.
              </p>

              <div className="flex justify-center space-x-1 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-6 w-1.5 rounded-full ${i === 0 ? 'bg-red-500' : 'bg-gray-200'}`}
                  />
                ))}
              </div>

              <div className="flex flex-col items-center justify-center mb-8">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="8"
                    />

                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="251.2"
                      transform="rotate(-90 50 50)"
                      style={{
                        animation: 'countdown-circle 3s linear forwards',
                      }}
                    />
                  </svg>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">
                      {countdown}
                    </span>
                  </div>
                </div>

                <p className="text-gray-500 text-sm mt-2">
                  App will close in{' '}
                  <span className="font-bold text-red-500">{countdown}</span>{' '}
                  seconds
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 py-3 px-6">
            <p className="text-xs text-center text-gray-500">
              Troubleshooting ID: NET_ERR_CONNECTION_LOST
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes countdown-circle {
            0% {
              stroke-dashoffset: 0;
            }
            100% {
              stroke-dashoffset: 251.2;
            }
          }

          @keyframes pulse {
            from {
              opacity: 0.1;
            }
            to {
              opacity: 0.3;
            }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
};

export default AppWrapper;
