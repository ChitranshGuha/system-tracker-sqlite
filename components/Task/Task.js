import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TaskForm from './TaskForm';
import ActiveSession from './ActiveSession';
import ActionButtons from './ActionButtons';
import useTaskLogic from './useTaskLogic';
import HardReset from '../HardReset';
import ApiErrorLogger from '../ApiErrorLogger';
import { gettingEmployeeActionsList } from '../../redux/employee/employeeActions';
import { FolderSync } from 'lucide-react';

const Task = ({
  startLogging,
  stopLogging,
  isLogging,
  activeSession,
  setActiveSession,
  ownerId,
  authToken,
  stats,
  activityInterval,
  socket,
  projectTaskId,
  setProjectTaskId,
  description,
  setDescription,
  endedActivityRestart,
  setEndedActivityRestart,
  setIsLoading,
  updateTrackedHourDetails,
  initialSpeed,
}) => {
  const dispatch = useDispatch();
  const isOnline = useSelector(
    (state) => state.employee.internetConnectionStatus
  );

  const projects = useSelector((state) => state?.employee?.projects?.list);
  const tasks = useSelector((state) => state?.employee?.tasks?.list);
  const [apiError, setApiError] = useState(null);

  const {
    projectId,
    setProjectId,
    errors,
    handleFormSubmit,
    handleKeyDown,
    stopLoggingHandler,
  } = useTaskLogic(
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
    setApiError,
    isLogging,
    initialSpeed
  );

  useEffect(() => {
    if (projectId) {
      const screenshotType = projects?.find((prj) => prj?.id === projectId)
        ?.projectMember?.screenshotMode;
      localStorage.setItem('screenshotType', screenshotType);
      window.electronAPI.sendScreenshotType?.(screenshotType);
    }
  }, [projectId]);

  const onSyncProject = () => {
    dispatch(
      gettingEmployeeActionsList(
        authToken,
        'employee/project/project/list',
        'projects',
        { ownerId }
      )
    );
  };

  return (
    <>
      {apiError ? (
        <ApiErrorLogger error={apiError} onClose={() => setApiError(null)} />
      ) : null}

      <div className="mb-6 sm:mb-8 relative">
        {isOnline && (
          <HardReset
            stopLoggingHandler={stopLoggingHandler}
            isLogging={isLogging}
            setIsLoading={setIsLoading}
            ownerId={ownerId}
            authToken={authToken}
          />
        )}

        {!isLogging && isOnline && (
          <button
            onClick={onSyncProject}
            className="absolute top-6 right-20 flex items-center justify-center p-3 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition-all duration-800 hover:scale-105"
            aria-label="Sync Projects"
            title="Sync Projects"
          >
            <FolderSync className="size-6" />
          </button>
        )}

        <form
          onSubmit={handleFormSubmit}
          className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 rounded-xl shadow-sm"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {isLogging ? 'Active Logging Session' : 'Activity Details'}
          </h2>
          {!isLogging ? (
            <TaskForm
              projectId={projectId}
              setProjectId={setProjectId}
              projectTaskId={projectTaskId}
              setProjectTaskId={setProjectTaskId}
              description={description}
              setDescription={setDescription}
              errors={errors}
              handleKeyDown={handleKeyDown}
              projects={projects}
              tasks={tasks}
            />
          ) : (
            <ActiveSession
              activeSession={activeSession}
              projects={projects}
              tasks={tasks}
            />
          )}
          <ActionButtons
            isOnline={isOnline}
            isLogging={isLogging}
            handleFormSubmit={handleFormSubmit}
            stopLoggingHandler={stopLoggingHandler}
          />
        </form>
      </div>
    </>
  );
};

export default Task;
