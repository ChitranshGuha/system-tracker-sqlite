import React from "react";
import { FiFolder, FiList, FiFileText } from "react-icons/fi";

const ActiveSession = ({ activeSession, projects, tasks }) => {
  return (
    <div className="mb-6 space-y-4 pl-2">
      <div className="flex items-center space-x-2">
        <FiFolder className="text-indigo-500" />
        <span className="font-medium">Project:</span>
        <span>
          {projects.find((p) => p?.id === activeSession?.projectId)?.name}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <FiList className="text-indigo-500" />
        <span className="font-medium">Task:</span>
        <span>
          {tasks?.find((t) => t?.id === activeSession?.projectTaskId)?.name}
        </span>
      </div>
      <div className="flex items-start space-x-2">
        <FiFileText className="text-indigo-500 mt-1" />
        <span className="font-medium">Task Description:</span>
        <span className="flex-1">{activeSession?.description}</span>
      </div>
    </div>
  );
};

export default ActiveSession;
