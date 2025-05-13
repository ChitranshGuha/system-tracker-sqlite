import { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logOutEmployee } from '../redux/auth/authActions';

const HardReset = ({ isLogging, stopLoggingHandler, setIsLoading }) => {
  const dispatch = useDispatch();

  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isBlinking, setIsBlinking] = useState(true);

  useEffect(() => {
    if (!isModalOpen) return;

    const interval = setInterval(() => {
      setIsBlinking((prev) => !prev);
    }, 800);

    return () => clearInterval(interval);
  }, [isModalOpen]);

  function onClose() {
    setIsModalOpen(false);
    setIsConfirmed(false);
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="absolute top-6 right-6 flex items-center justify-center p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all duration-800 hover:scale-105"
        aria-label="Hard Reset"
        title="Hard Reset"
      >
        <AlertTriangle className="size-6" />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <div
            className={`relative z-10 w-full max-w-md p-6 mx-4 bg-white rounded-lg shadow-xl border-l-4 ${isConfirmed ? 'border-red-500' : 'border-amber-500'}`}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>

            <div
              className={`flex items-center gap-3 p-4 mb-4 rounded-md ${isConfirmed ? (isBlinking ? 'bg-red-100 text-red-800' : 'bg-red-600 text-white') : isBlinking ? 'bg-amber-100 text-amber-800' : 'bg-amber-600 text-white'} transition-colors duration-800`}
            >
              <AlertTriangle className="size-6 flex-shrink-0" />
              <h2 className="text-lg font-bold">Warning: Hard Reset</h2>
            </div>

            <div className="space-y-4 text-sm">
              <div
                className={`p-4 rounded-md border ${isConfirmed ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}
              >
                <p
                  className={`font-medium mb-2 ${isConfirmed ? 'text-red-800' : 'text-amber-800'}`}
                >
                  Warning: This is a critical system operation
                </p>
                <p className="text-gray-700">
                  {isConfirmed
                    ? `This action will forcibly terminate all current processes and
                  return the system to its initial state. Any unsaved data or
                  in-progress operations will be lost. The application will exit
                  after this operation.`
                    : `Initiating a hard reset should only be performed when the
                  application is unresponsive, frozen, or experiencing severe
                  technical issues that prevent normal operation.`}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!isConfirmed) {
                      setIsConfirmed(true);
                      return;
                    } else {
                      setIsLoading(true);

                      const stopLogging = () => {
                        if (isLogging) {
                          return stopLoggingHandler().then(
                            () =>
                              new Promise((resolve) => setTimeout(resolve, 500))
                          );
                        }
                        return Promise.resolve();
                      };

                      stopLogging()
                        .catch((err) => {
                          console.error('Error stopping logging:', err);
                        })
                        .finally(() => {
                          window.electronAPI.sendUserData({ authToken: null });
                          window.electronAPI.clearStoreStats();
                          dispatch(logOutEmployee());
                          setTimeout(() => localStorage.clear(), 500);
                          setIsLoading(false);
                          onClose();
                          if (isElectron) {
                            window.electronAPI.exitApp?.();
                          }
                        });
                    }
                  }}
                  className={`px-4 py-2 text-sm text-white rounded-md ${isConfirmed ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'} transition-colors flex items-center gap-2`}
                >
                  {isConfirmed ? (
                    <AlertTriangle className="size-4" />
                  ) : (
                    <AlertCircle className="size-4" />
                  )}
                  {isConfirmed ? 'Confirm Reset' : 'Are you sure?'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HardReset;
