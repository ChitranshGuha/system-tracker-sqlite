import React,{useState,useEffect,useRef} from 'react';
import { useSelector,useDispatch } from 'react-redux';
import { FiPlay, FiSquare, FiFolder, FiList, FiFileText } from 'react-icons/fi';
import { gettingEmployeeActionsList } from '../redux/employee/employeeActions';
import { activityActions } from '../redux/activity/activityActions';
import { TRACKER_VERSION } from '../utils/constants';

const Task = ({
    startLogging,stopLogging,isLogging,activeSession,setActiveSession,ownerId,authToken,stats,
    activityInterval,socket
}) => {
    const dispatch = useDispatch();
    const activityIntervalRef = useRef(null);
    const statsRef = useRef(stats);
    const projectTaskActivityDetailIdRef = useRef(stats);

    const [projectId, setProjectId] = useState('');
    const [projectTaskId, setProjectTaskId] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState({ projectId: '', projectTaskId: '', description: '' });
    const [projectTaskActivityId,setProjectTaskActivityId] = useState(null);
    const [projectTaskActivityDetailId,setProjectTaskActivityDetailId] = useState(null);

    const [employeeRealtimeProjectTaskActivityId,setEmployeeRealtimeProjectTaskActivityId] = useState(null);

    const projects = useSelector(state => state?.employee?.projects?.list);
    const tasks = useSelector(state => state?.employee?.tasks?.list);

    useEffect(() => {
        setProjectId('');
        setProjectTaskId('');
        dispatch(gettingEmployeeActionsList(authToken,"employee/project/project/list","projects",{
            ownerId
        }));
    },[ownerId])

    useEffect(() => {
        setProjectTaskId('');
        if(projectId){
            dispatch(gettingEmployeeActionsList(authToken,"employee/project/project/task/list","tasks",{
                ownerId,
                projectId,
            }))
        }
    },[projectId])

    useEffect(() => {
        statsRef.current = stats;
    }, [stats]);

    useEffect(() => {
        if(projectTaskActivityDetailId) projectTaskActivityDetailIdRef.current = projectTaskActivityDetailId
        else projectTaskActivityDetailIdRef.current = null
    },[projectTaskActivityDetailId])

    useEffect(() => {
        if(socket){
            socket.emit("/project/task/activity/update",{ employeeRealtimeProjectTaskActivityId,appWebsites : stats?.appWebsites });
            socket.on("/project/task/activity/update",response => console.log("Activity socket updated ::",response));
        } else {
            console.error("Socket is not connected!");
        }
    },[stats?.urls])

    async function projectDetailActions(activityId) {
        const ipAddress = await getIpAddress();
    
        const startUserData = {
            ownerId,
            projectTaskActivityId: activityId || projectTaskActivityId,
        };
    
        dispatch(activityActions(authToken, "start", startUserData, true))
        .then((status) => {
            if (status?.success) {
                setProjectTaskActivityDetailId(status?.id);
            } else {
                console.log(status?.error);
            }
        });
    
        const dispatchStartStop = () => {
            const updatedStats = statsRef.current;
            
            const stopUserData = {
                ownerId,
                projectTaskActivityDetailId : projectTaskActivityDetailIdRef.current,
                mouseClick: updatedStats?.clickCount,
                keystroke: updatedStats?.keyCount,
                ...(updatedStats?.accumulatedText ? { keyPressed: updatedStats?.accumulatedText } : {}),
                idleTime: updatedStats?.idleTime * 60,
                trackerVersion: TRACKER_VERSION,
                ipAddress,
                appWebsites : updatedStats?.appWebsites,
                urls : updatedStats?.urls
            };
    
            dispatch(activityActions(authToken, "end", stopUserData, true))
                .then((status) => {
                    if (status?.success) {
                        setProjectTaskActivityDetailId(null);
                        dispatch(activityActions(authToken, "start", startUserData, true))
                        .then((status) => {
                            if (status?.success) {
                                setProjectTaskActivityDetailId(status?.id);
                            } else {
                                console.log(status?.error);
                            }
                        });;
                    } else {
                        console.log(status?.error);
                    }
                });
        };
    
        activityIntervalRef.current = setInterval(dispatchStartStop, activityInterval * 1000 * 60);
    }

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const newErrors = {
          projectId: projectId ? '' : 'Project is required',
          projectTaskId: projectTaskId ? '' : 'Task is required',
          description: description ? '' : 'Task Description is required',
        };
        setErrors(newErrors);
    
        if (Object.values(newErrors).every(error => !error)) {
            const payload = { ownerId, projectTaskId, description };

            setActiveSession({ projectId, projectTaskId, description });
            dispatch(activityActions(authToken,"start",payload))
            .then(status => {
                if(status?.success){
                    setProjectTaskActivityId(status?.id);
                    const userData = {
                        ownerId,
                        projectTaskActivityId: status?.id
                    };
                    window.electronAPI.sendActivityData(userData);
                    startLogging();

                    if(socket){
                        socket.emit("/project/task/activity/start",{ projectTaskId });
                        socket.on("/project/task/activity/start",response => setEmployeeRealtimeProjectTaskActivityId(response?.data?.id));
                    } else {
                        console.error("Socket is not connected!");
                    }

                    projectDetailActions(status?.id);
                }
                else{
                    console.log(status?.error);
                }
            })
        }
    };

    const getIpAddress = async () => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error("Failed to get IP address", error);
            return "unknown";
        }
    };

    async function stopLoggingHandler(){
        const ipAddress = await getIpAddress();

        const payload = { 
            ownerId,
            mouseClick: stats?.clickCount,
            keystroke: stats?.keyCount,
            ...(stats?.accumulatedText ? {keyPressed: stats?.accumulatedText} : {}),
            idleTime: stats?.idleTime * 60,
            trackerVersion : TRACKER_VERSION,
            ipAddress,
            appWebsites : stats?.appWebsites,
            urls : stats?.urls
        };

        dispatch(activityActions(authToken, "end", {...payload,projectTaskActivityDetailId}, true))
        .then(status => {
            if(status?.success){
                setProjectTaskActivityDetailId(null);
                dispatch(activityActions(authToken,"end",{...payload,projectTaskActivityId}))
                .then(status => {
                    if(status?.success){
                        if(socket){
                            socket.emit("/project/task/activity/end", { employeeRealtimeProjectTaskActivityId });
                            socket.on("/project/task/activity/end", response => setEmployeeRealtimeProjectTaskActivityId(null));
                        } else {
                            console.error("Socket is not connected!");
                        }

                        clearInterval(activityIntervalRef.current);
                        activityIntervalRef.current = null;
        
                        setProjectId("");
                        setProjectTaskId("");
                        setDescription("");
                        setActiveSession(null);
                        setProjectTaskActivityId(null);
                        stopLogging();
                        const userData = {
                            ownerId : null,
                            projectTaskActivityId: null,
                        };
                        window.electronAPI.sendActivityData(userData);
                    }
                    else{
                        console.log(status?.error);
                    }
                })
            }
            else{
                console.log(status?.error)
            }
        });
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
                        <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                        <select
                        id="projectId"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        >
                        <option value="">Select a project</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                        </select>
                        {errors.projectId && <p className="mt-1 text-sm text-red-600">{errors.projectId}</p>}
                    </div>
    
                    <div>
                        <label htmlFor="projectTaskId" className="block text-sm font-medium text-gray-700 mb-1">Task</label>
                        <select
                        id="projectTaskId"
                        value={projectTaskId}
                        onChange={(e) => setProjectTaskId(e.target.value)}
                        disabled={!projectId}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                        >
                        <option value="">Select a task</option>
                        {tasks.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                        </select>
                        {errors.projectTaskId && <p className="mt-1 text-sm text-red-600">{errors.projectTaskId}</p>}
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
                            disabled={!projectTaskId}
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
                        <span>{projects.find(p => p.id === activeSession.projectId)?.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <FiList className="text-indigo-500" />
                        <span className="font-medium">Task:</span>
                        <span>{tasks?.find(t => t.id === activeSession.projectTaskId)?.name}</span>
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
                onClick={e => {
                    e.preventDefault();
                    stopLoggingHandler();
                }}
                disabled={!isLogging}
                type="button"
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