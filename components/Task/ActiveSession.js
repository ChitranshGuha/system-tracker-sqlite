import { Folder, List, FileText } from 'lucide-react';

const ActiveSession = ({ activeSession }) => {
  return (
    <div className="mb-6 space-y-4 pl-2">
      <div className="flex items-center space-x-2">
        <Folder size={18} className="text-indigo-500" />
        <span className="font-medium">Project:</span>
        <span>{activeSession?.projectName}</span>
      </div>
      <div className="flex items-center space-x-2">
        <List size={18} className="text-indigo-500" />
        <span className="font-medium">Task:</span>
        <span>{activeSession?.projectTaskName}</span>
      </div>
      <div className="flex items-start space-x-2">
        <FileText size={18} className="text-indigo-500 mt-1" />
        <span className="font-medium">Task Description:</span>
        <span className="flex-1">{activeSession?.description}</span>
      </div>
    </div>
  );
};

export default ActiveSession;
