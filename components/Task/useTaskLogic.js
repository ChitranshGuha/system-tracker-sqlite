import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { gettingEmployeeActionsList } from '../../redux/employee/employeeActions';
import { activityActions } from '../../redux/activity/activityActions';
import { TRACKER_VERSION } from '../../utils/constants';
import { getSpeed, getSystemTimezone } from '../../utils/helpers';

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
  setIsLoading
) => {
  const dispatch = useDispatch();
  const activityIntervalRef = useRef(null);
  const statsRef = useRef(stats);
  const projectTaskActivityDetailIdRef = useRef(stats);

  const initialLastStats = {
    clickCount: 0,
    keyCount: 0,
    idleTime: 0,
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
    if (projectId) {
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
    if (projectTaskActivityDetailId)
      projectTaskActivityDetailIdRef.current = projectTaskActivityDetailId;
    else projectTaskActivityDetailIdRef.current = null;
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
          socket.on('/project/task/activity/update', (response) =>
            console.log('Activity socket updated ::', response)
          );
        } else {
          console.error('Socket is not connected!');
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
    const ipAddress = await getIpAddress();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const dispatchStartStop = () => {
      console.log('stats main after', lastStatsRef.current, statsRef.current);
      const updatedStats = statsRef.current;
      const lastStats = lastStatsRef.current;
      const activityDifference = {
        mouseClick: +updatedStats?.clickCount - +lastStats.clickCount,
        keystroke: +updatedStats?.keyCount - +lastStats.keyCount,
        idleTime: (+updatedStats?.idleTime - +lastStats.idleTime) * 60,
        keyPressed: updatedStats?.accumulatedText?.slice(
          lastStats?.accumulatedText?.length
        ),
        appWebsiteDetails: updatedStats?.appWebsiteDetails?.slice(
          0,
          updatedStats?.appWebsiteDetails.length -
            lastStats?.appWebsiteDetails.length
        ),
      };

      lastStatsRef.current = {
        clickCount: +updatedStats?.clickCount,
        keyCount: +updatedStats?.keyCount,
        idleTime: +updatedStats?.idleTime,
        accumulatedText: updatedStats?.accumulatedText,
        appWebsiteDetails: updatedStats?.appWebsiteDetails,
      };

      const stopUserData = {
        ownerId,
        projectTaskActivityDetailId: projectTaskActivityDetailIdRef.current,
        trackerVersion: TRACKER_VERSION,
        ipAddress,
        appWebsites: updatedStats?.appWebsites || [],
        ...activityDifference,
      };

      dispatch(activityActions(authToken, 'end', stopUserData, true))
        .then((status) => {
          if (status?.success) {
            setProjectTaskActivityDetailId(null);
            localStorage.removeItem('projectTaskActivityDetailId');
          } else {
            console.log(status?.error);
          }
        })
        .catch((error) => {
          console.log('End failed:', error);
        })
        .finally(() => {
          dispatch(activityActions(authToken, 'start', startUserData, true))
            .then((status) => {
              if (status?.success) {
                setProjectTaskActivityDetailId(status?.id);
                localStorage.setItem('projectTaskActivityDetailId', status?.id);
              } else {
                console.log(status?.error);
              }
            })
            .catch((error) => {
              console.log('Start failed:', error);
            });
        });
    };

    if (activityIntervalRef.current) {
      clearInterval(activityIntervalRef.current);
    }

    activityIntervalRef.current = setInterval(
      dispatchStartStop,
      (activityInterval || 1) * 1000 * 60
    );
  };

  const projectDetailActions = async (activityId) => {
    const startUserData = {
      ownerId,
      projectTaskActivityId: activityId || projectTaskActivityId,
      timezone: getSystemTimezone(),
    };

    dispatch(activityActions(authToken, 'start', startUserData, true)).then(
      (status) => {
        if (status?.success) {
          setProjectTaskActivityDetailId(status?.id);
          localStorage.setItem('projectTaskActivityDetailId', status?.id);
        } else {
          console.log(status?.error);
        }
      }
    );

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
            projectTaskActivityId: status?.id,
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

          projectDetailActions(status?.id);
        } else {
          console.log(status?.error);
        }
      });

      setIsLoading(false);
    }
  };

  const stopLoggingHandler = async () => {
    setIsLoading(true);

    const ipAddress = await getIpAddress();

    const lastStats = lastStatsRef.current;

    const activityDifference = {
      mouseClick: +stats?.clickCount - +lastStats.clickCount,
      keystroke: +stats?.keyCount - +lastStats.keyCount,
      idleTime: (+stats?.idleTime - +lastStats.idleTime) * 60,
      keyPressed: stats?.accumulatedText?.slice(
        lastStats?.accumulatedText?.length
      ),
      appWebsiteDetails: stats?.appWebsiteDetails?.slice(
        0,
        stats?.appWebsiteDetails.length - lastStats?.appWebsiteDetails.length
      ),
    };

    const payload = {
      ownerId,
      mouseClick: stats?.clickCount,
      keystroke: stats?.keyCount,
      keyPressed: stats?.accumulatedText,
      idleTime: stats?.idleTime * 60,
      trackerVersion: TRACKER_VERSION,
      ipAddress,
      appWebsites: stats?.appWebsites,
      appWebsiteDetails: stats?.appWebsiteDetails,
    };

    dispatch(
      activityActions(
        authToken,
        'end',
        {
          ...payload,
          projectTaskActivityDetailId: projectTaskActivityDetailIdRef.current,
          ...activityDifference,
        },
        true
      )
    ).then((status) => {
      if (status?.success) {
        setProjectTaskActivityDetailId(null);
        localStorage.removeItem('projectTaskActivityDetailId');
        lastStatsRef.current = initialLastStats;
        dispatch(
          activityActions(authToken, 'end', {
            ...payload,
            projectTaskActivityId,
          })
        ).then((status) => {
          if (status?.success) {
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
            stopLogging();
            const userData = {
              ownerId: null,
              projectTaskActivityId: null,
            };
            window.electronAPI.sendActivityData(userData);
          } else {
            console.log(status?.error);
          }
        });
      } else {
        console.log(status?.error);
      }
    });

    setIsLoading(false);
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
        if (
          storedOwnerId &&
          storedProjectTaskActivityId &&
          storedProjectTaskActivityDetailId
        ) {
          const fetchData = async () => {
            setIsLoading(true);

            setProjectTaskActivityId(storedProjectTaskActivityId);
            projectTaskActivityDetailIdRef.current =
              storedProjectTaskActivityDetailId;

            const updatedStats = statsRef.current;
            lastStatsRef.current = {
              clickCount: +updatedStats?.clickCount,
              keyCount: +updatedStats?.keyCount,
              idleTime: +updatedStats?.idleTime,
              accumulatedText: updatedStats?.accumulatedText,
              appWebsiteDetails: updatedStats?.appWebsiteDetails,
            };

            const startUserData = {
              ownerId: storedOwnerId,
              projectTaskActivityId: storedProjectTaskActivityId,
              timezone: getSystemTimezone(),
            };

            try {
              await startStopActivityDetailHandler(startUserData);
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
            } catch (error) {
              console.error('Error in start activity handler:', error);
            } finally {
              setIsLoading(false);
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
  }, [authToken, socket]);

  useEffect(() => {
    if (endedActivityRestart) {
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
                        projectTaskActivityId: status?.id,
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

                      projectDetailActions(status?.id);
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
    }
  }, [endedActivityRestart, authToken, socket]);

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
