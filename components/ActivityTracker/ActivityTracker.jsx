import { useState, useEffect } from 'react';
import Login from '../../components/Login';
import Dashboard from '../../components/Dashboard';
import moment from 'moment';
import { useSelector, useDispatch } from 'react-redux';
import { appUpdateChecker, logOutEmployee } from '../../redux/auth/authActions';
import {
  getActivityEndStatus,
  removeActivityDetailTimeout,
} from '../../redux/activity/activityActions';
import Loader from '../../components/Loader';
import { API_BASE_URL, TRACKER_VERSION } from '../../utils/constants';
import { DOMAIN_TYPE } from '../../utils/constants';
import AppUpdater from '../../components/AppUpdater';
import { Download, RefreshCcw } from 'lucide-react';
import { DEFAULT_SCREENSHOT_TYPE } from '../../utils/constants';
import ApiSuccessLogger from '../SuccessToast';

function ActivityTracker({ isOnline }) {
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
  const [activityLocationInterval, setActivityLocationInterval] = useState(1);
  const authToken = useSelector((state) => state?.auth?.authToken);
  const [endedActivityRestart, setEndedActivityRestart] = useState(false);
  const [showNoUpdatesRequired, setShowNoUpdatesRequired] = useState(false);

  useEffect(() => {
    if (authToken !== null) {
      setIsLoggedIn(true);
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
    }
  }, [authToken]);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    stopLogging();
    window.electronAPI.sendUserData({ authToken: null });
    window.electronAPI.clearStoreStats();
    setStats(initialStats);
    dispatch(logOutEmployee());
  };

  useEffect(() => {
    const handleStatsUpdate = (stats) => {
      setStats(stats);
    };

    if (typeof window !== 'undefined' && window?.electronAPI) {
      window?.electronAPI?.onUpdateStats(handleStatsUpdate);
      window.electronAPI.getInitialStats().then(handleStatsUpdate);
    }

    return () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        window?.electronAPI?.onUpdateStats(handleStatsUpdate);
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

          const restartOfflineLogging = async () => {
            const response = await window.electronAPI.sendActivityData({
              ownerId: localStorage.getItem('ownerId'),
            });

            if (response?.success) {
              window.electronAPI.restartLogging();
            }
          };

          if (isOnline) {
            dispatch(getActivityEndStatus(storedAuthToken, payload)).then(
              async (data) => {
                const shouldNotRemoveTimer =
                  await window.electronAPI.shouldNotRemoveTimer?.();

                if (
                  data?.data?.endTime ||
                  shouldNotRemoveTimer ||
                  !localStorage.getItem('projectTaskActivityDetailId')
                ) {
                  window.electronAPI.startLogging();
                  setStats(initialStats);
                  setEndedActivityRestart(true);
                } else {
                  setIsLoading(true);

                  dispatch(
                    removeActivityDetailTimeout(storedAuthToken, payload)
                  )
                    .then(async () => {
                      await restartOfflineLogging();
                      setIsLoading(false);
                    })
                    .catch((error) => {
                      console.error(
                        'Error removing activity detail timeout:',
                        error
                      );
                      setIsLoading(false);
                    });
                }
              }
            );
          } else {
            restartOfflineLogging();
          }
        }
      }
    }
  }, [isOnline]);

  useEffect(() => {
    if (typeof window.electronAPI === 'undefined') return;

    const screenshotType = localStorage.getItem('screenshotType');
    if (screenshotType) {
      window.electronAPI.sendScreenshotType?.(
        screenshotType || DEFAULT_SCREENSHOT_TYPE
      );
    }
  }, [isLogging]);

  const [domainId, setDomainId] = useState(null);

  function fetchDomainId() {
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
  }

  useEffect(() => {
    if (!authToken) {
      fetchDomainId();
    }
  }, [authToken]);

  // Update Checker
  const UPDATE_CHECKER_TIME = 60 * 60 * 1000;
  const [canCheckUpdate, setCanCheckUpdate] = useState(true);

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

  useEffect(() => {
    const lastChecked = localStorage.getItem('lastUpdateCheck');
    if (lastChecked) {
      const diff = Date.now() - parseInt(lastChecked, 10);
      if (diff < UPDATE_CHECKER_TIME) {
        setCanCheckUpdate(false);
        const timeout = setTimeout(
          () => setCanCheckUpdate(true),
          UPDATE_CHECKER_TIME - diff
        );
        return () => clearTimeout(timeout);
      }
    }
  }, []);

  function updateCheckHandler() {
    if (!canCheckUpdate) return;

    if (domainId) {
      dispatch(appUpdateChecker({ domainId })).then((data) => {
        if (data?.success) {
          const isUpdateRequirement = data?.data?.version !== TRACKER_VERSION;

          if (isUpdateRequirement) {
            setIsUpdateRequired(true);
          } else {
            setShowNoUpdatesRequired(true);
          }

          localStorage.setItem('lastUpdateCheck', Date.now().toString());

          setCanCheckUpdate(false);
          setTimeout(() => {
            setCanCheckUpdate(true);
          }, UPDATE_CHECKER_TIME);
        }
      });
    }
  }

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
      ) : (
        canCheckUpdate && (
          <div
            title="Check for updates"
            className="cursor-pointer fixed z-50 top-2 right-2 flex items-center gap-2 bg-gray-100 text-gray-800 border border-gray-300 px-4 py-2 rounded-lg shadow-md"
            onClick={updateCheckHandler}
          >
            <span className="font-medium">Check for Update</span>
            <button className="inline-flex items-center gap-1 font-medium rounded transition">
              <RefreshCcw className="!w-4 !h-4" />
            </button>
          </div>
        )
      )}

      {updateRequiredModal ? (
        <AppUpdater
          isLogging={isLogging}
          isLoggedIn={isLoggedIn}
          updateData={updateData}
          onClose={() => setUpdateRequiredModal(false)}
        />
      ) : null}

      {showNoUpdatesRequired ? (
        <ApiSuccessLogger
          title="No Updates Available!"
          message="No Updates Available. The installed version is already the latest version."
          onClose={() => setShowNoUpdatesRequired(false)}
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

export default ActivityTracker;
