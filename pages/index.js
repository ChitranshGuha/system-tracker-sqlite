import { useEffect, useState } from 'react';
import ActivityTracker from '../components/ActivityTracker/ActivityTracker';
import { useSelector, useDispatch } from 'react-redux';
import { getAuthDetails } from '../redux/auth/authActions';
import SyncLoader from '../components/ActivityTracker/SyncLoader';

const ActivityLogger = () => {
  const isOnline = useSelector(
    (state) => state.employee.internetConnectionStatus
  );
  const dispatch = useDispatch();

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    dispatch(getAuthDetails());
  }, []);

  useEffect(() => {
    const handleSyncingStatus = (status) => {
      setIsSyncing(status);
    };

    if (typeof window !== 'undefined' && window?.electronAPI) {
      window?.electronAPI?.onSyncing?.(handleSyncingStatus);
    }

    return () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        window?.electronAPI?.onSyncing?.(handleSyncingStatus);
      }
    };
  }, []);

  return (
    <SyncLoader isSyncing={isSyncing}>
      <ActivityTracker isOnline={isOnline} />
    </SyncLoader>
  );
};

export default ActivityLogger;
