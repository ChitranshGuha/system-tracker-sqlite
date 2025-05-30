import { useState, useEffect } from 'react';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';
import moment from 'moment';
import { useSelector, useDispatch } from 'react-redux';
import {
  appUpdateChecker,
  getAuthDetails,
  logOutEmployee,
} from '../redux/auth/authActions';
import {
  getActivityEndStatus,
  removeActivityDetailTimeout,
} from '../redux/activity/activityActions';
import Loader from '../components/Loader';
import { API_BASE_URL, TRACKER_VERSION } from '../utils/constants';
import { DOMAIN_TYPE } from '../utils/constants';
import AppUpdater from '../components/AppUpdater';
import { Download } from 'lucide-react';

function ActivityLogger() {
  const dispatch = useDispatch();

  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [updateRequiredModal, setUpdateRequiredModal] = useState(false);
  const [updateData, setUpdateData] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isLogging, setIsLogging] = useState(false);
  const [clearStats, setClearStats] = useState(false);
  const [captureInterval, setCaptureInterval] = useState(1);
  const [activityInterval, setActivityInterval] = useState(1);
  // const [activityReportInterval, setActivityReportInterval] = useState(900);
  const [activityLocationInterval, setActivityLocationInterval] = useState(1);
  const authToken = useSelector((state) => state?.auth?.authToken);
  const [endedActivityRestart, setEndedActivityRestart] = useState(false);

  useEffect(() => {
    dispatch(getAuthDetails());
  }, []);

  useEffect(() => {
  if (authToken !== null) {
    setIsLoggedIn(true);

    const ownerId = localStorage.getItem('ownerId'); // assuming you store this
    if (ownerId && typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.sendUserData({
        authToken,
        ownerId,
      });
    }
  } else {
    setIsLoggedIn(false);
  }
}, [authToken]);

  const initialStats = {
    clickCount: 0,
    scrollCount: 0,
    keyCount: 0,
    accumulatedText: '',
    lastActive: moment(Date.now()).format('hh:mm:ss A'),
  };

  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    if (typeof window !== 'undefined' && window?.electronAPI) {
      window.electronAPI.getCaptureInterval((interval) => {
        setCaptureInterval(interval);
      });

      window.electronAPI.getActivityInterval((interval) => {
        setActivityInterval(interval);
      });

      window.electronAPI.getActivitySpeedLocationInterval((interval) => {
        setActivityLocationInterval(interval);
      });

      // window.electronAPI.getActivityReportInterval((interval) => {
      //   setActivityReportInterval(interval);
      // });
    }
  }, [authToken]);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    stopLogging();
    window.electronAPI.sendUserData({ authToken: null, ownerId: null });
    window.electronAPI.clearStoreStats();
    setStats(initialStats);
    dispatch(logOutEmployee());
  };

  useEffect(() => {
  const handleStatsUpdate = (stats) => setStats(stats);

  if (window?.electronAPI) {
    window.electronAPI.onUpdateStats(handleStatsUpdate);
    window.electronAPI.getInitialStats().then(handleStatsUpdate);
  }

  return () => {
    if (window?.electronAPI?.removeUpdateStatsListener) {
      window.electronAPI.removeUpdateStatsListener(handleStatsUpdate);
    }
  };
}, []);

  const startLogging = () => {
    if (!isLogging && typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.startLogging();
      setIsLogging(true);
      setStats(initialStats);
      localStorage.setItem('isLogging', JSON.stringify(true));
      setClearStats(true);
    }
  };

  useEffect(() => {
    if (clearStats && typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.clearStoreStats();
      setClearStats(false);
    }
  }, [clearStats]);

  const stopLogging = () => {
    if (isLogging && typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.stopLogging();
      setIsLogging(false);
      setStats(initialStats);
      localStorage.setItem('isLogging', JSON.stringify(false));
      setClearStats(true);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedIsLogging = JSON.parse(localStorage.getItem('isLogging'));
      const storedAuthToken = localStorage.getItem('employeeAuthToken');
      if (storedIsLogging && storedAuthToken) {
        setIsLogging(storedIsLogging);

        const storedOwnerId = localStorage.getItem('ownerId');
        const storedProjectTaskActivityId = localStorage.getItem(
          'projectTaskActivityId'
        );
        if (storedOwnerId && storedProjectTaskActivityId) {
          const payload = {
            ownerId: storedOwnerId,
            projectTaskActivityId: storedProjectTaskActivityId,
          };
          dispatch(getActivityEndStatus(storedAuthToken, payload)).then(
            (data) => {
              if (data?.data?.endTime) {
                window.electronAPI.startLogging();
                setStats(initialStats);
                setEndedActivityRestart(true);
              } else {
                dispatch(removeActivityDetailTimeout(storedAuthToken, payload))
                  .then(async () => {
                    setIsLoading(true);
                    const response = await window.electronAPI.sendActivityData({
                      ownerId: localStorage.getItem('ownerId'),
                      projectTaskActivityId: localStorage.getItem(
                        'projectTaskActivityId'
                      ),
                    });

                    if (response?.success) {
                      window.electronAPI.restartLogging();
                    }
                    setIsLoading(false);
                  })
                  .catch((error) => {
                    setIsLoading(false);
                    console.error(
                      'Error removing activity detail timeout:',
                      error
                    );
                  });
              }
            }
          );
        }
      }
    }
  }, []);

  const [domainId, setDomainId] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/employee/auth/domain/get`, {
      method: 'POST',
      body: JSON.stringify({ domainName: DOMAIN_TYPE }),
      headers: {
        'Content-type': 'Application/json',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setDomainId(data?.data?.id);
      });
  }, []);

  useEffect(() => {
    if (domainId) {
      dispatch(appUpdateChecker({ domainId })).then((data) => {
        if (data?.success) {
          const isUpdateRequirement = data?.data?.version !== TRACKER_VERSION;
          if (isUpdateRequirement) {
            setIsUpdateRequired(true);
            setUpdateRequiredModal(true);
          }
          setUpdateData(data?.data);
        }
      });
    }
  }, [domainId]);

  return (
    <>
      {isUpdateRequired ? (
        <div
          title="Update available"
          className="cursor-pointer fixed z-50 top-2 right-2 flex items-center gap-2 bg-yellow-100 text-yellow-800 border border-yellow-300 px-4 py-2 rounded-lg shadow-md"
          onClick={() => setUpdateRequiredModal(true)}
        >
          <span className="font-medium">Update available</span>
          <button className="inline-flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium px-3 py-1 rounded transition">
            <Download className="!w-4 !h-4" />
          </button>
        </div>
      ) : null}

      {updateRequiredModal ? (
        <AppUpdater
          isLogging={isLogging}
          isLoggedIn={isLoggedIn}
          updateData={updateData}
          onClose={() => setUpdateRequiredModal(false)}
        />
      ) : null}

      {!isLoggedIn ? (
        <Login onLogin={handleLogin} domainId={domainId} />
      ) : (
        <Loader isLoading={isLoading}>
          <Dashboard
            onLogout={handleLogout}
            stats={stats}
            startLogging={startLogging}
            stopLogging={stopLogging}
            isLogging={isLogging}
            captureInterval={captureInterval}
            activityInterval={activityInterval}
            // activityReportInterval={activityReportInterval}
            activityLocationInterval={activityLocationInterval}
            authToken={authToken}
            endedActivityRestart={endedActivityRestart}
            setEndedActivityRestart={setEndedActivityRestart}
            setIsLoading={setIsLoading}
          />
        </Loader>
      )}
    </>
  );
}

export default ActivityLogger;
