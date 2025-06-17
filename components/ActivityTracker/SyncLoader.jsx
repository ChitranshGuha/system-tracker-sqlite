import { useEffect, useState } from 'react';
import { Loader2, Shield, Activity, Camera, AlertTriangle } from 'lucide-react';

const SyncLoader = ({ isSyncing, children }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isSyncing) return;

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isSyncing]);

  return (
    <div className="relative">
      {children}

      {isSyncing && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: '1500' }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 border border-gray-200">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <div className="absolute inset-0 w-16 h-16 bg-blue-200 rounded-full animate-ping opacity-20" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Syncing Data{dots}
              </h2>
              <p className="text-gray-600">
                Please wait while we sync your information
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
                <span className="text-sm font-medium text-blue-800">
                  Syncing activity stats
                </span>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <Camera className="w-5 h-5 text-green-600 animate-pulse" />
                <span className="text-sm font-medium text-green-800">
                  Uploading screenshots
                </span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 mb-1">
                    Important Notice
                  </p>
                  <p className="text-amber-700 leading-relaxed">
                    Please don't close the app until you see the main screen,
                    otherwise you might lose data. You can continue working -
                    the tracker will monitor activity as usual.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <Shield className="w-4 h-4" />
              <span>Your data is being securely synchronized</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncLoader;
