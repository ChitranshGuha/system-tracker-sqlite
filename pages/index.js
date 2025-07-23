import { useEffect, useState } from 'react';
import ActivityTracker from '../components/ActivityTracker/ActivityTracker';
import { useSelector, useDispatch } from 'react-redux';
import { getAuthDetails } from '../redux/auth/authActions';
import SyncLoader from '../components/ActivityTracker/SyncLoader';
import SleepMode from '../components/ActivityTracker/SleepMode';

const ActivityLogger = () => {
  const isOnline = useSelector(
    (state) => state.employee.internetConnectionStatus
  );
  const dispatch = useDispatch();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSleepMode, setIsSleepMode] = useState(false);

  useEffect(() => {
    dispatch(getAuthDetails());
  }, []);

  useEffect(() => {
    const handleSyncingStatus = (status) => {
      setIsSyncing(status);
    };

    const handleSleepModeStatus = (status) => {
      setIsSleepMode(status);
    };

    if (typeof window !== 'undefined' && window?.electronAPI) {
      window.electronAPI.onSyncing?.(handleSyncingStatus);
      window.electronAPI.onSleepMode?.(handleSleepModeStatus);
    }

    return () => {
      if (typeof window !== 'undefined' && window?.electronAPI) {
        window.electronAPI.removeSyncingListener?.();
        window.electronAPI.removeSleepModeListeners?.();
      }
    };
  }, []);

  return (
    <SyncLoader isSyncing={isSyncing}>
      {isSleepMode ? <SleepMode /> : <ActivityTracker isOnline={isOnline} />}
    </SyncLoader>
  );
};

export default ActivityLogger;
