import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { gettingEmployeeActionsList } from '../../redux/employee/employeeActions';
import { activityActions } from '../../redux/activity/activityActions';
import { TRACKER_VERSION } from '../../utils/constants';
import { getSpeed, getSystemTimezone } from '../../utils/helpers';
import { DEFAULT_SCREENSHOT_TYPE } from '../../utils/constants';

const useTaskLogic = (
  ownerId,
  authToken,
  stats,
  activityInterval,
  socket,
  setActiveSession,
  stopLogging,
  startLogging,
  projects,
  tasks,
  projectTaskId,
  setProjectTaskId,
  description,
  setDescription,
  endedActivityRestart,
  setEndedActivityRestart,
  setIsLoading,
  updateTrackedHourDetails,
  setApiError
) => {
  const dispatch = useDispatch();
  const isOnline = useSelector(
    (state) => state.employee.internetConnectionStatus
  );
  const workspaces = useSelector((state) => state?.employee?.workspaces?.list);

  const activityIntervalRef = useRef(null);
  const intervalStartTimeRef = useRef(null);
  const statsRef = useRef(stats);
  const projectTaskActivityDetailIdRef = useRef(null);

  const initialLastStats = {
    clickCount: 0,
    scrollCount: 0,
    keyCount: 0,
    accumulatedText: [],
    appWebsiteDetails: [],
  };
  const lastStatsRef = useRef(initialLastStats);

  const [projectId, setProjectId] = useState('');

  const [errors, setErrors] = useState({
    projectId: '',
    projectTaskId: '',
    description: '',
  });
  const [projectTaskActivityId, setProjectTaskActivityId] = useState(null);
  const [projectTaskActivityDetailId, setProjectTaskActivityDetailId] =
    useState(null);
  const [
    employeeRealtimeProjectTaskActivityId,
    setEmployeeRealtimeProjectTaskActivityId,
  ] = useState(null);
  const [activityLength, setActivityLength] = useState(0);

  useEffect(() => {
    setProjectId('');
    setProjectTaskId('');
    if (authToken) {
      dispatch(
        gettingEmployeeActionsList(
          authToken,
          'employee/project/project/list',
          'projects',
          { ownerId }
        )
      );
    }
  }, [ownerId, authToken, dispatch]);

  useEffect(() => {
    setProjectTaskId('');
    if (projectId && authToken) {
      dispatch(
        gettingEmployeeActionsList(
          authToken,
          'employee/project/project/task/list',
          'tasks',
          {
            ownerId,
            projectId,
          }
        )
      );
    }
  }, [projectId, ownerId, authToken, dispatch]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    projectTaskActivityDetailIdRef.current = projectTaskActivityDetailId;
  }, [projectTaskActivityDetailId]);

  useEffect(() => {
    if (
      employeeRealtimeProjectTaskActivityId &&
      employeeRealtimeProjectTaskActivityId !== null &&
      stats?.appWebsiteDetails
    ) {
      if (activityLength !== stats?.appWebsiteDetails?.length) {
        if (socket) {
          socket.emit('/project/task/activity/update', {
            employeeRealtimeProjectTaskActivityId,
            appWebsites: stats?.appWebsites || [],
            appWebsiteDetails: stats?.appWebsiteDetails,
          });
          socket.on('/project/task/activity/update', () => {});
        } else {
          console.error('Socket f not connected!');
        }
      }
      setActivityLength(stats?.appWebsiteDetails?.length);
    }
  }, [
    stats?.appWebsiteDetails,
    employeeRealtimeProjectTaskActivityId,
    socket,
    activityLength,
  ]);

  const getIpAddress = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Failed to get IP address', error);
      return 'unknown';
    }
  };

  const startStopActivityDetailHandler = async (startUserData) => {
    let ipAddress = 'offline';
    if (isOnline) {
      ipAddress = await getIpAddress();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const dispatchStartStop = () => {
      const updatedStats = statsRef.current;
      const lastStats = lastStatsRef.current;

      const getPositiveDifference = (current = 0, previous = 0) => {
        const diff = +current - +previous;
        return diff > 0 ? diff : 0;
      };

      const activityDifference = {
        mouseClick: getPositiveDifference(
          updatedStats?.clickCount,
          lastStats.clickCount
        ),
        scroll: getPositiveDifference(
          updatedStats?.scrollCount,
          lastStats.scrollCount
        ),
        keystroke: getPositiveDifference(
          updatedStats?.keyCount,
          lastStats.keyCount
        ),
        keyPressed: updatedStats?.accumulatedText?.slice(
          lastStats?.accumulatedText?.length
        ),
        appWebsiteDetails: updatedStats?.appWebsiteDetails?.slice(
          0,
          updatedStats?.appWebsiteDetails?.length -
            lastStats?.appWebsiteDetails?.length
        ),
      };

      lastStatsRef.current = {
        clickCount: +updatedStats?.clickCount,
        scrollCount: +updatedStats?.scrollCount,
        keyCount: +updatedStats?.keyCount,
        accumulatedText: updatedStats?.accumulatedText,
        appWebsiteDetails: updatedStats?.appWebsiteDetails,
      };

      if (isOnline) {
        const currentActivityDetailId =
          projectTaskActivityDetailIdRef.current ||
          localStorage.getItem('projectTaskActivityDetailId');

        const endActivityPromise = currentActivityDetailId
          ? dispatch(
              activityActions(
                authToken,
                'end',
                {
                  ownerId,
                  projectTaskActivityDetailId: currentActivityDetailId,
                  trackerVersion: TRACKER_VERSION,
                  ipAddress,
                  appWebsites: updatedStats?.appWebsites || [],
                  ...activityDifference,
                },
                true
              )
            )
              .then((status) => {
                if (status?.success) {
                  updateTrackedHourDetails(status?.totalTime, status?.idleTime);
                  setProjectTaskActivityDetailId(null);
                  localStorage.removeItem('projectTaskActivityDetailId');
                } else {
                  console.log('End activity error:', status?.error);
                }
              })
              .catch((error) => {
                console.log('End failed:', error);
              })
          : Promise.resolve();

        endActivityPromise.finally(() => {
          dispatch(activityActions(authToken, 'start', startUserData, true))
            .then((status) => {
              if (status?.success) {
                setProjectTaskActivityDetailId(status?.id);
                intervalStartTimeRef.current = Date.now();
                localStorage.setItem('projectTaskActivityDetailId', status?.id);
              } else {
                console.log('Start activity error:', status?.error);
              }
            })
            .catch((error) => {
              console.log('Start failed:', error);
            });
        });
      } else {
        const offlineActivityData = {
          ownerId,
          projectTaskActivityId:
            projectTaskActivityId ||
            localStorage.getItem('projectTaskActivityId'),

          trackerVersion: TRACKER_VERSION,
          ipAddress,
          appWebsites: updatedStats?.appWebsites || [],
          ...activityDifference,
          startTime: new Date(intervalStartTimeRef.current).toISOString(),
          endTime: new Date().toISOString(),
        };

        window.electronAPI.sendOfflineActivityData?.(offlineActivityData);
        intervalStartTimeRef.current = Date.now();
      }
    };

    if (!isOnline && intervalStartTimeRef.current) {
      const bufferTimeInSeconds = 5000;
      const currentTime = Date.now();
      const intervalDuration = (activityInterval || 1) * 1000 * 60;
      const elapsedTime = currentTime - intervalStartTimeRef.current;
      const remainingTime =
        intervalDuration - elapsedTime + bufferTimeInSeconds;

      if (remainingTime > 0) {
        setTimeout(() => {
          intervalStartTimeRef.current = Date.now() + bufferTimeInSeconds;

          if (activityIntervalRef.current) {
            clearInterval(activityIntervalRef.current);
          }

          activityIntervalRef.current = setInterval(
            dispatchStartStop,
            (activityInterval || 1) * 1000 * 60
          );
        }, remainingTime);

        return;
      }
    }

    if (activityIntervalRef.current) {
      clearInterval(activityIntervalRef.current);
    }

    activityIntervalRef.current = setInterval(
      dispatchStartStop,
      (activityInterval || 1) * 1000 * 60
    );
  };

  const projectDetailActions = async () => {
    const startUserData = {
      ownerId,
      timezone: getSystemTimezone(),
    };

    try {
      const status = await dispatch(
        activityActions(authToken, 'start', startUserData, true)
      );

      if (status?.success) {
        intervalStartTimeRef.current = Date.now();
        setProjectTaskActivityDetailId(status?.id);
        localStorage.setItem('projectTaskActivityDetailId', status?.id);
      } else {
        console.log('Start activity failed:', status?.error);
      }
    } catch (error) {
      console.error('Error dispatching activity start:', error);
    } finally {
      setIsLoading(false);
    }

    startStopActivityDetailHandler(startUserData);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {
      projectId: projectId ? '' : 'Project is required',
      projectTaskId: projectTaskId ? '' : 'Task is required',
      description: description ? '' : 'Task Description is required',
    };
    setErrors(newErrors);

    if (Object.values(newErrors).every((error) => !error)) {
      setIsLoading(true);

      const geoLocation = await window.electronAPI.getGeoLocation();
      const speed = await getSpeed();

      const payload = {
        ownerId,
        projectTaskId,
        description,
        timezone: getSystemTimezone(),
        ...geoLocation,
        speed,
      };

      const activeSessionObj = {
        projectName: projects.find((p) => p?.id === projectId)?.name,
        projectTaskName: tasks?.find((t) => t?.id === projectTaskId)?.name,
        description,
        workspaceName: workspaces?.find((w) => w.ownerId === ownerId)
          ?.workspaceName,
      };

      setActiveSession(activeSessionObj);
      localStorage.setItem('activeSession', JSON.stringify(activeSessionObj));
      localStorage.setItem('projectTaskId', projectTaskId);

      dispatch(activityActions(authToken, 'start', payload)).then((status) => {
        if (status?.success) {
          setProjectTaskActivityId(status?.id);
          localStorage.setItem('projectTaskActivityId', status?.id);

          const userData = {
            ownerId,
          };
          window.electronAPI.sendActivityData(userData);
          startLogging();

          if (socket) {
            let payload = {
              projectTaskId,
              description,
              timezone: getSystemTimezone(),
              ...geoLocation,
              speed,
            };

            socket.emit('/project/task/activity/start', payload);
            socket.on('/project/task/activity/start', (response) => {
              const id = response?.data?.id;
              setEmployeeRealtimeProjectTaskActivityId(id);
            });
          } else {
            console.error('Socket is not connected!');
          }

          projectDetailActions();
        } else {
          console.log(status?.error);
        }
      });
    }
  };

  const stopLoggingHandler = async () => {
    setIsLoading(true);

    let ipAddress = 'offline';
    if (isOnline) {
      ipAddress = await getIpAddress();
    }

    const lastStats = lastStatsRef.current;

    const activityDifference = {
      mouseClick: +stats?.clickCount - +lastStats.clickCount,
      scroll: +stats?.scrollCount - +lastStats.scrollCount,
      keystroke: +stats?.keyCount - +lastStats.keyCount,
      keyPressed: stats?.accumulatedText?.slice(
        lastStats?.accumulatedText?.length
      ),
      appWebsiteDetails: stats?.appWebsiteDetails?.slice(
        0,
        stats?.appWebsiteDetails?.length - lastStats?.appWebsiteDetails?.length
      ),
    };

    const payload = {
      ownerId,
      mouseClick: stats?.clickCount,
      scroll: stats?.scrollCount || 0,
      keystroke: stats?.keyCount,
      keyPressed: stats?.accumulatedText,
      trackerVersion: TRACKER_VERSION,
      ipAddress,
      appWebsites: stats?.appWebsites,
      appWebsiteDetails: stats?.appWebsiteDetails,
    };

    try {
      const currentActivityDetailId =
        projectTaskActivityDetailIdRef.current ||
        localStorage.getItem('projectTaskActivityDetailId');

      if (currentActivityDetailId) {
        const endActivityDetail = await dispatch(
          activityActions(
            authToken,
            'end',
            {
              ...payload,
              projectTaskActivityDetailId: currentActivityDetailId,
              ...activityDifference,
            },
            true
          )
        );

        if (endActivityDetail?.success) {
          setProjectTaskActivityDetailId(null);
          localStorage.removeItem('projectTaskActivityDetailId');
          lastStatsRef.current = initialLastStats;
          intervalStartTimeRef.current = null;
        } else {
          setApiError({
            message: endActivityDetail?.error?.data?.error,
            code: endActivityDetail?.error?.status,
          });
          setIsLoading(false);
          return;
        }
      }

      const currentProjectActivityId =
        projectTaskActivityId || localStorage.getItem('projectTaskActivityId');

      const endMainActivity = await dispatch(
        activityActions(authToken, 'end', {
          ownerId,
          trackerVersion: TRACKER_VERSION,
          ipAddress,
          projectTaskActivityId: currentProjectActivityId,
        })
      );

      if (endMainActivity?.success) {
        if (socket) {
          socket.emit('/project/task/activity/end', {
            employeeRealtimeProjectTaskActivityId,
          });

          socket.on('/project/task/activity/end', () => {
            setEmployeeRealtimeProjectTaskActivityId(null);
          });
        } else {
          console.error('Socket is not connected!');
        }

        clearInterval(activityIntervalRef.current);
        activityIntervalRef.current = null;

        setProjectId('');
        setProjectTaskId('');
        setProjectTaskActivityId(null);
        setDescription('');
        setActiveSession(null);

        localStorage.removeItem('activeSession');
        localStorage.removeItem('projectTaskId');
        localStorage.removeItem('projectTaskActivityId');
        localStorage.removeItem('screenshotType');

        window.electronAPI.sendScreenshotType?.(DEFAULT_SCREENSHOT_TYPE);

        stopLogging();

        const userData = {
          ownerId: null,
        };
        window.electronAPI.sendActivityData(userData);
      } else {
        setApiError({
          message: endMainActivity?.error?.data?.error,
          code: endMainActivity?.error?.status,
        });
      }
    } catch (error) {
      setApiError({
        message: error?.error?.data?.error,
        code: error?.error?.status,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && authToken !== null) {
      const storedIsLogging = JSON.parse(localStorage.getItem('isLogging'));
      const storedOwnerId = localStorage.getItem('ownerId');
      const storedProjectTaskId = localStorage.getItem('projectTaskId');
      const storedProjectTaskActivityId = localStorage.getItem(
        'projectTaskActivityId'
      );
      const storedProjectTaskActivityDetailId = localStorage.getItem(
        'projectTaskActivityDetailId'
      );

      if (storedIsLogging) {
        if (storedOwnerId && storedProjectTaskActivityId) {
          const fetchData = async () => {
            if (isOnline) {
              setIsLoading(true);
            }

            if (storedProjectTaskActivityDetailId) {
              setProjectTaskActivityDetailId(storedProjectTaskActivityDetailId);
            }

            const updatedStats = statsRef.current;
            lastStatsRef.current = {
              clickCount: +updatedStats?.clickCount,
              scrollCount: +updatedStats?.scrollCount,
              keyCount: +updatedStats?.keyCount,
              accumulatedText: updatedStats?.accumulatedText,
              appWebsiteDetails: updatedStats?.appWebsiteDetails,
            };

            const startUserData = {
              ownerId: storedOwnerId,
              timezone: getSystemTimezone(),
            };

            try {
              await startStopActivityDetailHandler(startUserData);
              if (isOnline) {
                if (socket && authToken) {
                  let payload = {
                    projectTaskId: storedProjectTaskId,
                    description,
                    timezone: getSystemTimezone(),
                  };

                  socket.emit('/project/task/activity/start', payload);
                  socket.on('/project/task/activity/start', (response) => {
                    const id = response?.data?.id;
                    setEmployeeRealtimeProjectTaskActivityId(id);
                  });
                } else {
                  console.error('Socket is not connected!');
                }
              }
            } catch (error) {
              console.error('Error in start activity handler:', error);
            }
          };

          fetchData();
        }
      }
    }

    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
        activityIntervalRef.current = null;
      }
    };
  }, [authToken, socket, isOnline]);

  useEffect(() => {
    if (endedActivityRestart && isOnline) {
      if (typeof window !== 'undefined' && authToken !== null) {
        const storedIsLogging = JSON.parse(localStorage.getItem('isLogging'));
        const storedOwnerId = localStorage.getItem('ownerId');
        const storedProjectTaskId = localStorage.getItem('projectTaskId');
        const storedDescription =
          localStorage.getItem('activeSession')?.description;
        localStorage.removeItem('projectTaskActivityId');
        localStorage.removeItem('projectTaskActivityDetailId');
        lastStatsRef.current = initialLastStats;
        setProjectTaskActivityId(null);
        setProjectTaskActivityDetailId(null);

        if (storedIsLogging) {
          if (storedOwnerId && storedProjectTaskId) {
            const fetchData = async () => {
              setIsLoading(true);

              try {
                const geoLocation = await window.electronAPI.getGeoLocation();
                const speed = await getSpeed();

                const payload = {
                  ownerId: storedOwnerId,
                  projectTaskId: storedProjectTaskId,
                  description: storedDescription,
                  timezone: getSystemTimezone(),
                  ...geoLocation,
                  speed,
                };

                dispatch(activityActions(authToken, 'start', payload)).then(
                  (status) => {
                    if (status?.success) {
                      setProjectTaskActivityId(status?.id);
                      localStorage.setItem('projectTaskActivityId', status?.id);

                      const userData = {
                        ownerId,
                      };
                      window.electronAPI.sendActivityData(userData);
                      startLogging();

                      if (socket) {
                        let payload = {
                          projectTaskId,
                          description,
                          timezone: getSystemTimezone(),
                          ...geoLocation,
                          speed,
                        };

                        socket.emit('/project/task/activity/start', payload);
                        socket.on(
                          '/project/task/activity/start',
                          (response) => {
                            const id = response?.data?.id;
                            setEmployeeRealtimeProjectTaskActivityId(id);
                          }
                        );
                      } else {
                        console.error('Socket is not connected!');
                      }

                      projectDetailActions();
                    } else {
                      console.log(status?.error);
                    }
                  }
                );
              } catch (error) {
                console.error('Error in start activity handler:', error);
              } finally {
                setEndedActivityRestart(false);
              }
            };

            fetchData();
          }
        }
      }
    } else if (!endedActivityRestart) {
      intervalStartTimeRef.current = Date.now();
    }
  }, [endedActivityRestart, authToken, socket, isOnline]);

  return {
    projectId,
    setProjectId,
    projectTaskId,
    setProjectTaskId,
    description,
    setDescription,
    errors,
    handleFormSubmit,
    handleKeyDown,
    stopLoggingHandler,
  };
};

export default useTaskLogic;
