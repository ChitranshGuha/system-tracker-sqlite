import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { WifiOff, Wifi } from 'lucide-react';
import { getInternetConnectionStatus } from '../redux/employee/employeeActions';
import InstructionModal from './InstructionsModal';

const ManualOffline = () => {
  const APP_OFFLINE_SWITCH_INTERVAL = 15 * 60 * 1000;
  const dispatch = useDispatch();
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  const isOnline = useSelector(
    (state) => state.employee.internetConnectionStatus
  );

  const [manualOffline, setManualOffline] = useState(false);
  const [isOnlineDisabled, setIsOnlineDisabled] = useState(false);
  const [isActuallyOnline, setIsActuallyOnline] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const handleConfirmOffline = () => {
    setShowModal(false);
    triggerManualOffline(true);
  };

  const handleCancelOffline = () => {
    setShowModal(false);
  };

  const triggerManualOffline = (mode) => {
    if (!mode && isOnlineDisabled) return;

    setManualOffline(mode);
    dispatch(getInternetConnectionStatus(!mode));

    if (isElectron) {
      mode
        ? window.electronAPI?.notifyOffline?.()
        : window.electronAPI?.notifyOnline?.();
    }

    if (mode) {
      const expiresAt = Date.now() + APP_OFFLINE_SWITCH_INTERVAL;

      localStorage.setItem(
        'manualOfflineState',
        JSON.stringify({ manualOffline: true, expiresAt })
      );

      setIsOnlineDisabled(true);
      setTimeout(() => {
        setIsOnlineDisabled(false);
      }, APP_OFFLINE_SWITCH_INTERVAL);
    } else {
      localStorage.removeItem('manualOfflineState');
    }
  };

  const manualOfflineHandler = (mode) => {
    if (mode && !manualOffline) {
      setShowModal(true);
    } else {
      triggerManualOffline(mode);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('manualOfflineState');
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();

      if (parsed.manualOffline) {
        setManualOffline(true);
        dispatch(getInternetConnectionStatus(false));

        if (isElectron) {
          window.electronAPI?.notifyOffline?.();
        }

        if (parsed.expiresAt && parsed.expiresAt > now) {
          setIsOnlineDisabled(true);
          const remaining = parsed.expiresAt - now;
          setTimeout(() => {
            setIsOnlineDisabled(false);
          }, remaining);
        }
      }
    }
  }, []);

  useEffect(() => {
    const updateOnlineStatus = () => setIsActuallyOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  if (!isActuallyOnline) return null;

  return (
    <>
      {showModal && (
        <InstructionModal
          message={`This option is preferable if you are facing <b>low or unstable internet speed</b> frequently. You can <b>renable</b> the offline mode only after <b>${
            APP_OFFLINE_SWITCH_INTERVAL / (60 * 1000)
          } minutes</b>.`}
          onClose={handleCancelOffline}
        >
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            onClick={handleConfirmOffline}
          >
            Confirm
          </button>
          <button
            className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-sm"
            onClick={handleCancelOffline}
          >
            Cancel
          </button>
        </InstructionModal>
      )}

      <div className="bg-white px-2 py-1 rounded-full shadow-md flex items-center space-x-2 text-sm">
        <label className="flex items-center space-x-1 cursor-pointer">
          <input
            type="radio"
            name="connectionMode"
            value="offline"
            checked={!isOnline}
            onChange={() => manualOfflineHandler(true)}
            className="hidden"
          />
          <div
            className={`flex items-center px-3 py-1 rounded-full transition-all duration-300 ${
              manualOffline
                ? 'bg-red-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={
              manualOffline
                ? 'You are already in offline mode'
                : 'Switch to offline mode'
            }
          >
            <WifiOff className="w-4 h-4 mr-1" />
            <span>Offline</span>
          </div>
        </label>

        <label
          className={`flex items-center space-x-1 ${
            isOnlineDisabled
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
        >
          <input
            type="radio"
            name="connectionMode"
            value="online"
            checked={isOnline}
            onChange={() => manualOfflineHandler(false)}
            className="hidden"
            disabled={isOnlineDisabled}
          />
          <div
            title={
              isOnlineDisabled
                ? 'Rapid switches are not allowed. Please try after some time'
                : 'Switch to online mode'
            }
            className={`flex items-center px-3 py-1 rounded-full transition-all duration-300 ${
              !manualOffline
                ? 'bg-green-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Wifi className="w-4 h-4 mr-1" />
            <span>Online</span>
          </div>
        </label>
      </div>
    </>
  );
};

export default ManualOffline;
