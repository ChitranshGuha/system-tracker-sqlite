import { useEffect } from 'react';
import ActivityTracker from '../components/ActivityTracker/ActivityTracker';
import { useSelector, useDispatch } from 'react-redux';
import { getAuthDetails } from '../redux/auth/authActions';
import SyncLoader from '../components/ActivityTracker/SyncLoader';

const ActivityLogger = () => {
  const isOnline = useSelector(
    (state) => state.employee.internetConnectionStatus
  );
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getAuthDetails());
  }, []);

  return <ActivityTracker isOnline={isOnline} />;
};

export default ActivityLogger;
