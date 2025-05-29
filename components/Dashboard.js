import { useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FiMousePointer,
  FiClock,
  FiMove,
  FiActivity,
  FiPackage,
} from 'react-icons/fi';
import { IoSpeedometerOutline } from 'react-icons/io5';
import { BsKeyboard } from 'react-icons/bs';
import { ClockAlert, Hourglass, X } from 'lucide-react';
import Task from './Task/Task';
import PastActivities from './PastActivities';
import { gettingEmployeeActionsList } from '../redux/employee/employeeActions';
import io from 'socket.io-client';
import InternetSpeedTracker from './InternetSpeedTracker';
import AppUsage from './AppUsage';
import { BASE_URL, IS_PRODUCTION, TRACKER_VERSION } from '../utils/constants';
import { fetchTrackingTimeDetails } from '../redux/activity/activityActions';
import { getSystemTimezone } from '../utils/helpers';
import SlidingTimeDisplay from './SlidingTimeDisplay';

function ActivityLogger({
  onLogout,
  stats,
  startLogging,
  stopLogging,
  isLogging,
  captureInterval,
  authToken,
  activityInterval,
  activityLocationInterval,
  endedActivityRestart,
  setEndedActivityRestart,
  setIsLoading,
}) {
  const dispatch = useDispatch();

  const [ownerId, setOwnerId] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    dispatch(
      gettingEmployeeActionsList(
        authToken,
        'employee/auth/workspace/list',
        'workspaces'
      )
    );
  }, []);

  useEffect(() => {
    if (ownerId && authToken) {
      const socketInstance = io(
        `${BASE_URL}/employee?token=${authToken}&ownerId=${ownerId}`
      );

      setSocket(socketInstance);

      socketInstance.on('connect', () => {
        console.log('Socket connection successful!');
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error, socketInstance);
      });

      return () => {
        socketInstance.disconnect();
      };
    }
  }, [ownerId, authToken]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCannotLogoutModal, setShowCannotLogoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState('current');

  const [projectTaskId, setProjectTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [activeSession, setActiveSession] = useState(null);

  const user = useSelector((state) => state?.auth?.employeeDetails);

  const workspaces = useSelector((state) => state?.employee?.workspaces?.list);

  const handleLogout = () => {
    onLogout();
    setShowLogoutModal(false);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedIsLogging = JSON.parse(localStorage.getItem('isLogging'));
      const storedOwnerId = localStorage.getItem('ownerId');
      const storedActiveSession = localStorage.getItem('activeSession');
      const storedProjectTaskId = localStorage.getItem('projectTaskId');
      if (storedIsLogging) {
        if (storedOwnerId) {
          setOwnerId(storedOwnerId);
        }
        if (storedActiveSession) {
          const storedActiveSessionObj = JSON.parse(storedActiveSession);
          setActiveSession(storedActiveSessionObj);
          setDescription(storedActiveSessionObj?.description);
        }
        if (storedProjectTaskId) {
          setProjectTaskId(storedProjectTaskId);
        }
      }
    }
  }, []);

  const handleWorkspaceSelection = (e) => {
    const value = e.target.value;
    setOwnerId(value);
    localStorage.setItem('ownerId', value);
  };

  // Tracked hours details

  const [animate, setAnimate] = useState(false);
  const [trackedHourDetails, setTrackedHourDetails] = useState({
    trackedHourInSeconds: 0,
    idleTime: 0,
  });

  const [updatedDetailsFromApi, setUpdatedDetailsFromApi] = useState(null);

  const updateTrackedHourDetails = useCallback(
    (newSeconds, idleTimeInSeconds) => {
      setUpdatedDetailsFromApi({ newSeconds, idleTimeInSeconds });
    },
    [trackedHourDetails]
  );

  useEffect(() => {
    if (updatedDetailsFromApi) {
      setTrackedHourDetails(() => {
        setAnimate(true);
        setTimeout(() => setAnimate(false), 300);

        return {
          trackedHourInSeconds:
            +trackedHourDetails?.trackedHourInSeconds +
            (+updatedDetailsFromApi?.newSeconds ?? 0),
          idleTime:
            +trackedHourDetails?.idleTime +
            (+updatedDetailsFromApi?.idleTimeInSeconds ?? 0),
        };
      });
    }
    setUpdatedDetailsFromApi(null);
  }, [updatedDetailsFromApi]);

  useEffect(() => {
    let trackedHourTimeout;

    if (authToken && ownerId) {
      const trackedHourDetailApiCall = () =>
        dispatch(
          fetchTrackingTimeDetails(authToken, {
            ownerId,
            timezone: getSystemTimezone(),
          })
        ).then((res) => {
          const newSeconds =
            res?.data?.data?.length === 0 ? 0 : res?.data?.data?.[0]?.totalTime;
          const idleTime =
            res?.data?.data?.length === 0 ? 0 : res?.data?.data?.[0]?.idleTime;
          setTrackedHourDetails((prev) => {
            if (prev.trackedHourInSeconds !== newSeconds) {
              setAnimate(true);
              setTimeout(() => setAnimate(false), 300);
            }

            return {
              idleTime,
              trackedHourInSeconds: newSeconds,
            };
          });
        });

      trackedHourTimeout = setTimeout(trackedHourDetailApiCall, 0);
    }

    return () => {
      clearTimeout(trackedHourTimeout);
    };
  }, [authToken, ownerId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-4 sm:p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                Activity Logger
              </h1>
              <FiActivity className="text-indigo-600 text-xl sm:text-3xl ml-2" />
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 shadow-sm">
              <FiPackage className="h-4 w-4" />
              <span>Current Version: {TRACKER_VERSION}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {ownerId ? (
              <select
                value={ownerId}
                disabled={isLogging}
                onChange={handleWorkspaceSelection}
                className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.ownerId} value={workspace.ownerId}>
                    {workspace.workspaceName}
                  </option>
                ))}
              </select>
            ) : null}
            <div
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-semibold cursor-pointer"
              style={{ backgroundColor: '#059669' }}
              onClick={() => !isLogging && setShowLogoutModal(true)}
              onMouseEnter={() => isLogging && setShowCannotLogoutModal(true)}
              onMouseLeave={() => isLogging && setShowCannotLogoutModal(false)}
            >
              {user?.firstName?.[0]?.toUpperCase()}

              {showCannotLogoutModal && (
                <div className="absolute top-full right-0 mt-2 z-50 max-w-[200px]">
                  <div className="relative w-max text-white bg-red-500 text-xs px-3 py-2 rounded shadow-lg">
                    <div className="absolute -top-2 right-3 w-0 h-0 border-l-6 border-r-6 border-b-6 border-l-transparent border-r-transparent border-b-white"></div>
                    Cannot logout while activity logging
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {ownerId ? (
          <>
            {/* Tabs */}
            <div className="flex mb-6">
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'current'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                onClick={() => setActiveTab('current')}
              >
                Active Tab Session
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'past'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                onClick={() => setActiveTab('past')}
              >
                Past Activities
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === 'app-usage'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
                onClick={() => setActiveTab('app-usage')}
              >
                App Usage
              </button>
            </div>

            <div
              className={`${activeTab === 'current' ? 'visible' : 'hidden'}`}
            >
              <Task
                startLogging={startLogging}
                stopLogging={stopLogging}
                isLogging={isLogging}
                activeSession={activeSession}
                setActiveSession={setActiveSession}
                ownerId={ownerId}
                authToken={authToken}
                stats={stats}
                activityInterval={activityInterval}
                socket={socket}
                projectTaskId={projectTaskId}
                setProjectTaskId={setProjectTaskId}
                description={description}
                setDescription={setDescription}
                endedActivityRestart={endedActivityRestart}
                setEndedActivityRestart={setEndedActivityRestart}
                setIsLoading={setIsLoading}
                updateTrackedHourDetails={updateTrackedHourDetails}
              />

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xxl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <FiMousePointer className="text-blue-600 text-xl sm:text-2xl" />
                    <p className="text-2xl sm:text-3xl font-bold text-blue-800">
                      {stats.clickCount}
                    </p>
                  </div>
                  <p className="text-sm text-blue-600 font-medium">
                    Mouse Clicks
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <BsKeyboard className="text-green-600 text-xl sm:text-2xl" />
                    <p className="text-2xl sm:text-3xl font-bold text-green-800">
                      {stats.keyCount}
                    </p>
                  </div>
                  <p className="text-sm text-green-600 font-medium">
                    Keystrokes
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-100 to-pink-200 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <FiMove className="text-purple-700 text-xl sm:text-2xl" />
                    <p className="text-2xl sm:text-3xl font-bold text-pink-800">
                      {stats.scrollCount}
                    </p>
                  </div>
                  <p className="text-sm text-purple-700 font-medium">Scrolls</p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <ClockAlert className="text-red-600 text-xl sm:text-2xl" />
                    <p className="text-2xl sm:text-3xl font-bold text-red-800">
                      {Math.floor(+trackedHourDetails.idleTime ?? 0) / 60}
                    </p>
                  </div>
                  <p className="text-sm text-red-600 font-medium">
                    Idle Time (min)
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <IoSpeedometerOutline className="text-purple-600 text-xl sm:text-2xl" />
                    <p className="text-2xl sm:text-3xl font-bold">
                      <InternetSpeedTracker
                        socket={socket}
                        interval={activityLocationInterval}
                      />
                    </p>
                  </div>
                  <p className="text-sm text-purple-600 font-medium">
                    Internet Speed (Mbps)
                  </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-100 to-green-200 p-4 sm:p-6 rounded-xl shadow shadow-emerald-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <Hourglass className="text-emerald-600 !h-6 !w-6" />
                    <SlidingTimeDisplay
                      seconds={trackedHourDetails.trackedHourInSeconds}
                      animate={animate}
                    />
                  </div>
                  <p className="text-sm text-emerald-700 font-semibold">
                    Active Time
                  </p>
                </div>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 sm:p-6 rounded-xl shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
                    <div className="flex items-center">
                      <FiActivity className="text-purple-600 text-lg sm:text-xl mr-2" />
                      <p className="text-base sm:text-lg font-medium text-gray-700">
                        Last Active
                      </p>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-indigo-600">
                      {stats.lastActive || '--'}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 sm:p-6 rounded-xl shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
                    <div className="flex items-center">
                      <FiClock className="text-indigo-600 text-lg sm:text-xl mr-2" />
                      <p className="text-base sm:text-lg font-medium text-gray-700">
                        Capture Interval
                      </p>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-indigo-600">
                      {captureInterval}{' '}
                      {captureInterval <= 1 ? 'minute' : 'minutes'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Keys Pressed Section */}
              {IS_PRODUCTION ? null : (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 rounded-xl shadow-sm mb-6 min-h-[300px] sm:min-h-[400px] overflow-y-auto">
                  <div className="flex items-center mb-3">
                    <BsKeyboard className="text-gray-600 text-lg sm:text-xl mr-2" />
                    <h2 className="font-semibold text-gray-700 text-base sm:text-lg">
                      Keys pressed:
                    </h2>
                  </div>
                  <p className="whitespace-normal break-words text-gray-600 text-sm sm:text-base">
                    {stats.accumulatedText}
                  </p>
                </div>
              )}
            </div>

            <div className={`${activeTab === 'past' ? 'visible' : 'hidden'}`}>
              <PastActivities
                authToken={authToken}
                ownerId={ownerId}
                isLogging={isLogging}
                activeTab={activeTab}
              />
            </div>

            <div
              className={`${activeTab === 'app-usage' ? 'visible' : 'hidden'}`}
            >
              <AppUsage
                authToken={authToken}
                ownerId={ownerId}
                isLogging={isLogging}
                activeTab={activeTab}
              />
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-64">
            <select
              onChange={handleWorkspaceSelection}
              className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
              <option value="">Select a workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace.ownerId} value={workspace.ownerId}>
                  {workspace.workspaceName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">
                Confirm Logout
              </h2>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-600 mb-4">
                Are you sure you want to logout?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityLogger;
