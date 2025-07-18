import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { WifiOff, Wifi } from 'lucide-react';
import { getInternetConnectionStatus } from '../redux/employee/employeeActions';
import InstructionModal from './InstructionsModal';
import { APP_OFFLINE_SWITCH_INTERVAL } from '../utils/constants';

const serverErrorModalMessage = `
  <div class="flex items-start space-x-2 bg-amber-50 border border-amber-200 p-4 rounded-md">
    <div class="pt-1">
      <svg xmlns="http://www.w3.org/2000/svg" class="text-amber-500 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M10.29 3.86L1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0zM12 9v4m0 4h.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="text-sm text-gray-800">
      <p class="font-semibold mb-1">You're being switched to offline mode.</p>
      <p class="mb-2">
        Due to <strong class="text-amber-700">periodic server maintenance</strong>, our servers are temporarily unavailable. 
        To ensure uninterrupted tracking, we are switching you to <strong>offline mode</strong>.
      </p>
      <p class="mb-2">
        You can continue working normally. If you experience <em>low or unstable internet speed</em>, staying offline is recommended.
      </p>
      <p class="mb-2 text-blue-600">
        You will be able to switch back to online mode after <strong>${APP_OFFLINE_SWITCH_INTERVAL / (60 * 1000)} minutes</strong>.
      </p>
      <p class="text-gray-600">
        Make sure the app has time to <strong>sync your data</strong> when you're back online.
      </p>
    </div>
  </div>
`;

const ManualOffline = forwardRef((_, ref) => {
  const dispatch = useDispatch();
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  const isOnline = useSelector(
    (state) => state.employee.internetConnectionStatus
  );

  const [manualOffline, setManualOffline] = useState(false);
  const [isOnlineDisabled, setIsOnlineDisabled] = useState(false);
  const [isActuallyOnline, setIsActuallyOnline] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showButtonsInModal, setShowButtonsInModal] = useState(false);

  const handleConfirmOffline = () => {
    setShowModal(false);
    triggerManualOffline(true);
  };

  const handleCloseModal = () => {
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
      setModalMessage(
        'This option is preferable if you are facing technical glitches and low or unstable internet speed frequently.'
      );
      setShowButtonsInModal(true);
      setShowModal(true);
    } else {
      triggerManualOffline(mode);
    }
  };

  useImperativeHandle(ref, () => ({
    onManualOfflineTrigger() {
      setShowModal(true);
      triggerManualOffline(true);
      setModalMessage(serverErrorModalMessage);
      setShowButtonsInModal(false);
    },
  }));

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
        <InstructionModal message={modalMessage} onClose={handleCloseModal}>
          {showButtonsInModal && (
            <>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                onClick={handleConfirmOffline}
              >
                Confirm
              </button>
              <button
                className="px-3 py-1 bg-gray-300 text-gray-800 rounded text-sm"
                onClick={handleCloseModal}
              >
                Cancel
              </button>
            </>
          )}
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
});

export default ManualOffline;
