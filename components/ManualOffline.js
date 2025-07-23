import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { WifiOff, Wifi, Info } from 'lucide-react';
import { getInternetConnectionStatus } from '../redux/employee/employeeActions';
import InstructionModal from './InstructionsModal';
import { APP_OFFLINE_SWITCH_INTERVAL } from '../utils/constants';

const modalMessageHandler = (minutes, isError) => {
  const canGoOnline = minutes <= 0;

  const iconSvg = isError
    ? `<svg xmlns="http://www.w3.org/2000/svg" class="text-amber-500 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M10.29 3.86L1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0zM12 9v4m0 4h.01" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="green">
        <path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4" />
        <circle cx="12" cy="12" r="10" stroke-width="2" />
      </svg>`;

  const heading = isError
    ? "You're being switched to offline mode"
    : 'Offline Mode';

  const reason = isError
    ? 'You can continue working normally and your activity will be tracked in offline mode.'
    : 'Your activity will be tracked in offline mode. This option is preferable if you are facing <b>technical glitches and low or unstable internet speed</b> frequently.';

  const switchInfo = canGoOnline
    ? `<p class="mb-2 text-green-600 font-medium">You can now switch back to online mode at any time.</p>`
    : `<p class="mb-2 text-blue-600">You will be able to switch back to online mode after <strong>${minutes} minute${minutes > 1 ? 's' : ''}</strong>.</p>`;

  const syncMessage = `<p class="mb-2">When you go online after ${canGoOnline ? 'this period' : `${minutes} minute${minutes > 1 ? 's' : ''}`} or any time you want to, your activity will be synced to the server.</p>`;

  return `
    <div class="flex items-start space-x-2 bg-amber-50 border border-amber-200 p-4 rounded-md">
      <div class="pt-1">${iconSvg}</div>
      <div class="text-sm">
        <p class="${isError ? 'font-semibold' : 'font-bold text-lg'} mb-3">${heading}</p>
        <ul class="list-disc">
          <li><p class="mb-2">${reason}</p></li>
          <li>${switchInfo}</li>
          <li>${syncMessage}</li>
          <li>
            <p>
              Make sure to wait for loading screen to disappear on the app to <strong>sync your data</strong> when you're back online.
            </p>
          </li>
        </ul>
      </div>
    </div>
  `;
};

const ManualOffline = forwardRef((_, ref) => {
  const defaultMinutes = Math.ceil(APP_OFFLINE_SWITCH_INTERVAL / (60 * 1000));
  const dispatch = useDispatch();
  const isElectron = typeof window !== 'undefined' && window.electronAPI;
  const [isTriggered, setIsTriggered] = useState(false);

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
      setModalMessage(modalMessageHandler(defaultMinutes));
      setShowButtonsInModal(true);
      setIsTriggered(false);
      setShowModal(true);
    } else {
      triggerManualOffline(mode);
    }
  };

  useImperativeHandle(ref, () => ({
    onManualOfflineTrigger() {
      setShowModal(true);
      setIsTriggered(true);
      triggerManualOffline(true);
      setModalMessage(modalMessageHandler(defaultMinutes, true));
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

  function infoModalHandler() {
    let minutesLeft = defaultMinutes;

    const stored = localStorage.getItem('manualOfflineState');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.manualOffline && parsed.expiresAt) {
          const now = Date.now();
          const remainingMs = parsed.expiresAt - now;

          if (remainingMs <= 0) {
            minutesLeft = 0;
          } else {
            minutesLeft = Math.ceil(remainingMs / (60 * 1000));
          }
        }
      } catch (e) {
        console.error('Failed to parse manualOfflineState:', e);
      }
    }

    setModalMessage(modalMessageHandler(minutesLeft, isTriggered));
    setShowButtonsInModal(false);
    setShowModal(true);
  }

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
        {!isOnline && (
          <Info
            className="cursor-pointer text-blue-500 hover:text-blue-700"
            onClick={infoModalHandler}
          />
        )}

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
