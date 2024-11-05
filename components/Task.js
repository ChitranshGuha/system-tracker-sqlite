import React,{useState} from 'react';
import { FiPlay, FiSquare, FiFolder, FiList, FiFileText } from 'react-icons/fi';

const Task = ({
    startLogging,stopLogging,isLogging,activeSession,setActiveSession
}) => {
    const [project, setProject] = useState('');
    const [task, setTask] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState({ project: '', task: '', description: '' });

    const projects = [
        { id: '1', name: 'Project A' },
        { id: '2', name: 'Project B' },
        { id: '3', name: 'Project C' },
    ];
    
    const tasks = {
        '1': [{ id: '1', name: 'Task 1' }, { id: '2', name: 'Task 2' }],
        '2': [{ id: '3', name: 'Task 3' }, { id: '4', name: 'Task 4' }],
        '3': [{ id: '5', name: 'Task 5' }, { id: '6', name: 'Task 6' }],
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const newErrors = {
          project: project ? '' : 'Project is required',
          task: task ? '' : 'Task is required',
          description: description ? '' : 'Task Description is required',
        };
        setErrors(newErrors);
    
        if (Object.values(newErrors).every(error => !error)) {
          setActiveSession({ project, task, description });
          startLogging();
        }
    };    

    function stopLoggingHandler(){
        setProject("");
        setTask("");
        setDescription("");
        setActiveSession(null);
        stopLogging();
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleFormSubmit(e);
        }
    }
  
  return (
    <div className="mb-6 sm:mb-8">
        <form onSubmit={handleFormSubmit} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{isLogging ? "Active Logging Session" : "Activity Details"}</h2>
            {!isLogging ? (
                 <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                        <select
                        id="project"
                        value={project}
                        onChange={(e) => setProject(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        >
                        <option value="">Select a project</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        </select>
                        {errors.project && <p className="mt-1 text-sm text-red-600">{errors.project}</p>}
                    </div>
    
                    <div>
                        <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-1">Task</label>
                        <select
                        id="task"
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        disabled={!project}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        >
                        <option value="">Select a task</option>
                        {project && tasks[project].map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                        </select>
                        {errors.task && <p className="mt-1 text-sm text-red-600">{errors.task}</p>}
                    </div>
    
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Task Description</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onKeyDown={handleKeyDown}
                            maxLength={100}
                            disabled={!task}
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="What task(s) are you doing? (max 100 characters)"
                        ></textarea>
                        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                    </div>
                </div>
            )
            : (
                <div className="mb-6 space-y-4 pl-2">
                    <div className="flex items-center space-x-2">
                        <FiFolder className="text-indigo-500" />
                        <span className="font-medium">Project:</span>
                        <span>{projects.find(p => p.id === activeSession.project)?.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <FiList className="text-indigo-500" />
                        <span className="font-medium">Task:</span>
                        <span>{tasks[activeSession.project]?.find(t => t.id === activeSession.task)?.name}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                        <FiFileText className="text-indigo-500 mt-1" />
                        <span className="font-medium">Task Description:</span>
                        <span className="flex-1">{activeSession.description}</span>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-6 lg:space-x-0 lg:grid lg:grid-cols-2 lg:gap-4">
            <button
                type='submit'
                disabled={isLogging}
                id="start-logging"
                className={`w-full py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center space-x-2 transition-all ${
                isLogging ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:shadow-md'
                }`}
            >
                <FiPlay className="text-xl" />
                <span>Start Logging</span>
            </button>
            
            <button
                onClick={stopLoggingHandler}
                disabled={!isLogging}
                id="stop-logging"
                className={`w-full py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center space-x-2 transition-all ${
                !isLogging ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:shadow-md'
                }`}
            >
                <FiSquare className="text-xl" />
                <span>Stop Logging</span>
            </button>
            </div>
        </form>
    </div>
  )
}

export default Task