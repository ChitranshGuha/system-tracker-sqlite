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
  activityReportInterval,
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
  setEndedActivityRestart
) => {
  const dispatch = useDispatch();
  const activityIntervalRef = useRef(null);
  const activityReportIntervalRef = useRef(null);
  const statsRef = useRef(stats);
  const projectTaskActivityDetailIdRef = useRef(stats);
  const projectTaskActivityReportIdRef = useRef(stats);

  const initialLastStats = {
    clickCount: 0,
    keyCount: 0,
    idleTime: 0,
    accumulatedText: [],
    appWebsiteDetails: [],
  };

  const lastStatsRef = useRef(initialLastStats);
  const lastReportsStatsRef = useRef(initialLastStats);

  const [projectId, setProjectId] = useState('');

  const [errors, setErrors] = useState({
    projectId: '',
    projectTaskId: '',
    description: '',
  });

  const [projectTaskActivityId, setProjectTaskActivityId] = useState(null);
  const [projectTaskActivityDetailId, setProjectTaskActivityDetailId] =
    useState(null);
  const [projectTaskActivityReportId, setProjectTaskActivityReportId] =
    useState(null);

  console.log('projectTaskActivityReportId', projectTaskActivityReportId);

  const [
    employeeRealtimeProjectTaskActivityId,
    setEmployeeRealtimeProjectTaskActivityId,
  ] = useState(null);
  const [activityLength, setActivityLength] = useState(0);

  useEffect(() => {
    setProjectId('');
    setProjectTaskId('');
    dispatch(
      gettingEmployeeActionsList(
        authToken,
        'employee/project/project/list',
        'projects',
        { ownerId }
      )
    );
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
    if (projectTaskActivityReportId)
      projectTaskActivityReportIdRef.current = projectTaskActivityReportId;
    else projectTaskActivityReportIdRef.current = null;
  }, [projectTaskActivityReportId]);

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
            appWebsites: stats?.appWebsites,
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

    const dispatchStartStop = (isReport) => {
      const updatedStats = statsRef.current;
      const lastStats = isReport
        ? lastReportsStatsRef?.current
        : lastStatsRef.current;

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

      [isReport ? lastReportsStatsRef : lastStatsRef].current = {
        clickCount: +updatedStats?.clickCount,
        keyCount: +updatedStats?.keyCount,
        idleTime: +updatedStats?.idleTime,
        accumulatedText: updatedStats?.accumulatedText,
        appWebsiteDetails: updatedStats?.appWebsiteDetails,
      };

      const stopUserData = {
        ownerId,
        ...(isReport
          ? {
              projectTaskActivityReportId:
                projectTaskActivityReportIdRef.current,
            }
          : {
              projectTaskActivityDetailId:
                projectTaskActivityDetailIdRef.current,
            }),
        trackerVersion: TRACKER_VERSION,
        ipAddress,
        appWebsites: updatedStats?.appWebsites,
        ...activityDifference,
      };

      dispatch(
        activityActions(authToken, 'end', stopUserData, true, isReport)
      ).then((status) => {
        if (status?.success) {
          if (isReport) {
            setProjectTaskActivityReportId(null);
            localStorage.removeItem('projectTaskActivityReportId');
          } else {
            setProjectTaskActivityDetailId(null);
            localStorage.removeItem('projectTaskActivityDetailId');
          }
          dispatch(
            activityActions(authToken, 'start', startUserData, true)
          ).then((status) => {
            if (status?.success) {
              if (isReport) {
                setProjectTaskActivityReportId(status?.id);
                localStorage.setItem('projectTaskActivityReportId', status?.id);
              } else {
                setProjectTaskActivityDetailId(status?.id);
                localStorage.setItem('projectTaskActivityDetailId', status?.id);
              }
            } else {
              console.log(status?.error);
            }
          });
        } else {
          console.log(status?.error);
        }
      });
    };

    if (activityIntervalRef.current) {
      clearInterval(activityIntervalRef.current);
    }

    if (activityReportIntervalRef.current) {
      clearInterval(activityReportIntervalRef.current);
    }

    activityIntervalRef.current = setInterval(
      () => dispatchStartStop(false),
      (activityInterval || 1) * 1000 * 60
    );

    activityReportIntervalRef.current = setInterval(
      () => dispatchStartStop(true),
      2 * 60 * 1000
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

    dispatch(
      activityActions(authToken, 'start', startUserData, true, true)
    ).then((status) => {
      if (status?.success) {
        setProjectTaskActivityReportId(status?.id);
        localStorage.setItem('projectTaskActivityReportId', status?.id);
      } else {
        console.log(status?.error);
      }
    });

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
    }
  };

  const stopLoggingHandler = async () => {
    const ipAddress = await getIpAddress();

    const baseStats = stats;

    const buildPayload = (lastStats, identifierKey, identifierValue) => {
      const activityDifference = {
        mouseClick: +baseStats?.clickCount - +lastStats?.clickCount,
        keystroke: +baseStats?.keyCount - +lastStats?.keyCount,
        idleTime: (+baseStats?.idleTime - +lastStats?.idleTime) * 60,
        keyPressed: baseStats?.accumulatedText?.slice(
          lastStats?.accumulatedText?.length
        ),
        appWebsiteDetails: baseStats?.appWebsiteDetails?.slice(
          0,
          baseStats?.appWebsiteDetails.length -
            lastStats?.appWebsiteDetails.length
        ),
      };

      return {
        ownerId,
        mouseClick: baseStats?.clickCount,
        keystroke: baseStats?.keyCount,
        keyPressed: baseStats?.accumulatedText,
        idleTime: baseStats?.idleTime * 60,
        trackerVersion: TRACKER_VERSION,
        ipAddress,
        appWebsites: baseStats?.appWebsites,
        appWebsiteDetails: baseStats?.appWebsiteDetails,
        ...activityDifference,
        [identifierKey]: identifierValue,
      };
    };

    try {
      const activityDetailStatus = await dispatch(
        activityActions(
          authToken,
          'end',
          buildPayload(
            lastStatsRef.current,
            'projectTaskActivityDetailId',
            projectTaskActivityDetailIdRef.current
          ),
          true
        )
      );

      if (activityDetailStatus?.success) {
        setProjectTaskActivityDetailId(null);
        localStorage.removeItem('projectTaskActivityDetailId');
        lastStatsRef.current = initialLastStats;
      } else {
        throw new Error(activityDetailStatus?.error);
      }

      const activityReportStatus = await dispatch(
        activityActions(
          authToken,
          'end',
          buildPayload(
            lastReportsStatsRef.current,
            'projectTaskActivityReportId',
            projectTaskActivityReportIdRef.current
          ),
          true,
          true
        )
      );

      if (activityReportStatus?.success) {
        setProjectTaskActivityReportId(null);
        localStorage.removeItem('projectTaskActivityReportId');
        lastReportsStatsRef.current = initialLastStats;
      } else {
        throw new Error(activityReportStatus?.error);
      }

      const finalStatus = await dispatch(
        activityActions(authToken, 'end', {
          ...buildPayload({}, 'projectTaskActivityId', projectTaskActivityId), // no difference calc here
        })
      );

      if (finalStatus?.success) {
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
        console.log(finalStatus?.error);
      }
    } catch (err) {
      console.log('Error :: ', err);
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

      const storedProjectTaskActivityReportId = localStorage.getItem(
        'projectTaskActivityReportId'
      );

      if (storedIsLogging) {
        if (
          storedOwnerId &&
          storedProjectTaskActivityId &&
          storedProjectTaskActivityDetailId &&
          storedProjectTaskActivityReportId
        ) {
          const fetchData = async () => {
            setProjectTaskActivityId(storedProjectTaskActivityId);
            projectTaskActivityDetailIdRef.current =
              storedProjectTaskActivityDetailId;

            projectTaskActivityReportIdRef.current =
              storedProjectTaskActivityReportId;

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
              console.error('Error in startStopActivityDetailHandler:', error);
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
        localStorage.removeItem('projectTaskActivityReportId');
        lastStatsRef.current = initialLastStats;
        lastReportsStatsRef.current = initialLastStats;
        setProjectTaskActivityId(null);
        setProjectTaskActivityDetailId(null);
        setProjectTaskActivityReportId(null);

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
