import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { getInternetConnectionStatus } from '../redux/employee/employeeActions';

const AppWrapper = ({ children }) => {
  const dispatch = useDispatch();

  const [online, setOnline] = useState(true);

  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  const handleInternetState = (state) => {
    const isOnline = state?.toLowerCase() === 'online';
    dispatch(getInternetConnectionStatus(Boolean(isOnline)));

    setOnline(Boolean(isOnline));

    if (isElectron) {
      window.electronAPI?.[isOnline ? 'notifyOnline' : 'notifyOffline']?.();
    }
  };

  useEffect(() => {
    const handleOffline = handleInternetState.bind(null, 'offline');
    const handleOnline = handleInternetState.bind(null, 'online');

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (!navigator.onLine) handleOffline();
    else handleOnline();

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [isElectron]);

  if (
    !online &&
    (!localStorage.getItem('employeeAuthToken') ||
      !localStorage.getItem('projectTaskActivityId'))
  ) {
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
                You need internet connection to start your tracking.
              </p>

              <div className="flex justify-center space-x-1 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-6 w-1.5 rounded-full ${i === 0 ? 'bg-red-500' : 'bg-gray-200'}`}
                  />
                ))}
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
