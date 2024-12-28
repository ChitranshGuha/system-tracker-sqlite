import React from "react";
import { useSelector } from "react-redux";
import TaskForm from "./TaskForm";
import ActiveSession from "./ActiveSession";
import ActionButtons from "./ActionButtons";
import useTaskLogic from "./useTaskLogic";

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
}) => {
  const {
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
  } = useTaskLogic(
    ownerId,
    authToken,
    stats,
    activityInterval,
    socket,
    setActiveSession,
    stopLogging,
    startLogging
  );

  const projects = useSelector((state) => state?.employee?.projects?.list);
  const tasks = useSelector((state) => state?.employee?.tasks?.list);

  return (
    <div className="mb-6 sm:mb-8">
      <form
        onSubmit={handleFormSubmit}
        className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 rounded-xl shadow-sm"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {isLogging ? "Active Logging Session" : "Activity Details"}
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
          isLogging={isLogging}
          handleFormSubmit={handleFormSubmit}
          stopLoggingHandler={stopLoggingHandler}
        />
      </form>
    </div>
  );
};

export default Task;
