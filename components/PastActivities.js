import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FiX, FiCalendar } from 'react-icons/fi';
import moment from 'moment';
import { useMediaQuery } from '@react-hook/media-query'

const PastActivities = () => {
    const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
    const isMobile = useMediaQuery('(max-width: 640px)')

    const pastActivities = [
        { id: 1, project: 'Project A', task: 'Task 1', startTime: '2024-11-05 09:00:00', endTime: '2024-11-05 11:30:00', duration: '2h 30m', mouseClicks: 450, keystrokes: 2300, idleMinutes: 28 },
        { id: 2, project: 'Project B', task: 'Task 3', startTime: '2024-11-05 13:00:00', endTime: '2024-11-05 16:45:00', duration: '3h 45m', mouseClicks: 680, keystrokes: 3500, idleMinutes: 22 },
        { id: 3, project: 'Project C', task: 'Task 5', startTime: '2024-11-04 10:00:00', endTime: '2024-11-04 12:15:00', duration: '2h 15m', mouseClicks: 320, keystrokes: 1800, idleMinutes: 10 },
        { id: 4, project: 'Project A', task: 'Task 2', startTime: '2024-11-04 14:00:00', endTime: '2024-11-04 17:00:00', duration: '3h 00m', mouseClicks: 550, keystrokes: 2800, idleMinutes: 18 },
        { id: 5, project: 'Project B', task: 'Task 4', startTime: '2024-11-03 09:30:00', endTime: '2024-11-03 12:30:00', duration: '3h 00m', mouseClicks: 400, keystrokes: 2100, idleMinutes: 12 },
        { id: 6, project: 'Project C', task: 'Task 6', startTime: '2024-11-03 13:30:00', endTime: '2024-11-03 16:00:00', duration: '2h 30m', mouseClicks: 380, keystrokes: 1950, idleMinutes: 14 },
        { id: 7, project: 'Project A', task: 'Task 1', startTime: '2024-11-02 08:00:00', endTime: '2024-11-02 11:00:00', duration: '3h 00m', mouseClicks: 520, keystrokes: 2700, idleMinutes: 20 },
        { id: 8, project: 'Project B', task: 'Task 3', startTime: '2024-11-02 13:00:00', endTime: '2024-11-02 15:30:00', duration: '2h 30m', mouseClicks: 420, keystrokes: 2200, idleMinutes: 16 },
        { id: 9, project: 'Project C', task: 'Task 5', startTime: '2024-11-01 09:00:00', endTime: '2024-11-01 12:00:00', duration: '3h 00m', mouseClicks: 600, keystrokes: 3100, idleMinutes: 25 },
        { id: 10, project: 'Project A', task: 'Task 2', startTime: '2024-11-01 13:30:00', endTime: '2024-11-01 16:30:00', duration: '3h 00m', mouseClicks: 580, keystrokes: 3000, idleMinutes: 23 },
        { id: 11, project: 'Project B', task: 'Task 4', startTime: '2024-10-31 10:00:00', endTime: '2024-10-31 13:00:00', duration: '3h 00m', mouseClicks: 490, keystrokes: 2550, idleMinutes: 19 },
        { id: 12, project: 'Project C', task: 'Task 6', startTime: '2024-10-31 14:00:00', endTime: '2024-10-31 17:00:00', duration: '3h 00m', mouseClicks: 530, keystrokes: 2750, idleMinutes: 21 },
        { id: 13, project: 'Project A', task: 'Task 1', startTime: '2024-10-30 09:00:00', endTime: '2024-10-30 11:30:00', duration: '2h 30m', mouseClicks: 400, keystrokes: 2100, idleMinutes: 15 },
        { id: 14, project: 'Project B', task: 'Task 3', startTime: '2024-10-30 13:00:00', endTime: '2024-10-30 16:00:00', duration: '3h 00m', mouseClicks: 570, keystrokes: 2950, idleMinutes: 24 },
        { id: 15, project: 'Project C', task: 'Task 5', startTime: '2024-10-29 10:00:00', endTime: '2024-10-29 13:00:00', duration: '3h 00m', mouseClicks: 510, keystrokes: 2650, idleMinutes: 20 },
    ];    

    const getPieChartData = (date) => {
        const activitiesForDate = pastActivities.filter(activity => moment(activity.startTime).format('YYYY-MM-DD') === date);
        if (activitiesForDate.length === 0) return null;
    
        const totalMouseClicks = activitiesForDate.reduce((sum, activity) => sum + activity.mouseClicks, 0);
        const totalKeystrokes = activitiesForDate.reduce((sum, activity) => sum + activity.keystrokes, 0);
        const totalIdleMinutes = activitiesForDate.reduce((sum, activity) => sum + activity.idleMinutes, 0);
    
        return [
            { name: 'Mouse Clicks', value: totalMouseClicks },
            { name: 'Keystrokes', value: totalKeystrokes },
            { name: 'Idle Minutes', value: totalIdleMinutes },
        ];
    };
    
    const pieChartData = getPieChartData(selectedDate);
    
    const COLORS = ['#1e40af', '#16a34a', '#dc2626'];
    const TEXT_COLORS = ['text-blue-800', 'text-green-600', 'text-red-600'];

    const isToday = moment(selectedDate).isSame(moment(), 'day');

return (
    <div className="space-y-6">
        {/* Daily Activity Breakdown Section */}
        <div className="border-b pb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-4 sm:space-y-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Daily Activity Breakdown</h2>
            <div className="flex items-center space-x-4">
            <div className="relative">
                <input
                type="date"
                id="dateSelect"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={moment().format('YYYY-MM-DD')}
                className="block w-44 pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            {!isToday && (
                <button
                onClick={() => setSelectedDate(moment().format('YYYY-MM-DD'))}
                className="text-red-600 hover:text-red-800 transition-colors duration-200 bg-red-100 hover:bg-red-200 px-3 py-2 rounded-md"
                >
                <FiX size={20} />
                </button>
            )}
            </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg sm:w-max sm:mx-auto">
            {pieChartData ? (
            <div className="h-[300px] w-full sm:w-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => {
                            if (isMobile) return null
                            const percentValue = (percent * 100).toFixed(0)
                            return `${name} ${percentValue}%`
                        }}
                    >
                    {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
                </ResponsiveContainer>
            </div>
            ) : (
            <div className="h-[300px] flex items-center justify-center">
                <p className="text-center text-gray-600">No data available for the selected date.</p>
            </div>
            )}
        </div>
        </div>

        {/* Project Activity Section */}
        <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6">Project Activity</h2>
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300 shadow-sm rounded-lg overflow-hidden">
            <thead>
                <tr className="bg-gray-100">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mouse Clicks</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keystrokes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Idle Minutes</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {pastActivities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold whitespace-nowrap">{activity.project}</td>
                    <td className="px-4 py-3 font-bold whitespace-nowrap">{activity.task}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                    {moment(activity.startTime).format('hh:mm A')}<br/>{moment(activity.startTime).format('DD MMM, YYYY')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                    {moment(activity.endTime).format('hh:mm A')}<br/>{moment(activity.endTime).format('DD MMM, YYYY')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{activity.duration}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${TEXT_COLORS[0]}`}>{activity.mouseClicks}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${TEXT_COLORS[1]}`}>{activity.keystrokes}</td>
                    <td className={`px-4 py-3 whitespace-nowrap ${TEXT_COLORS[2]}`}>{activity.idleMinutes}</td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        </div>
  </div>
);}

export default PastActivities;