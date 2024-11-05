"use client"

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { FiCalendar } from 'react-icons/fi'
import moment from 'moment'

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

export default function PastActivities() {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'))
  const [selectedMetric, setSelectedMetric] = useState('mouseClicks')

    const pastActivities = [
        { id: 1, project: 'Project A', task: 'Task 1', startTime: '2024-11-05 09:00:00', endTime: '2024-11-05 11:30:00', duration: '2h 30m', mouseClicks: 450, keystrokes: 2300, idleMinutes: 128 },
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
        const activitiesForDate = pastActivities.filter(activity => moment(activity.startTime).format('YYYY-MM-DD') === date)
        if (activitiesForDate.length === 0) return []
    
        const totalMouseClicks = activitiesForDate.reduce((sum, activity) => sum + activity.mouseClicks, 0)
        const totalKeystrokes = activitiesForDate.reduce((sum, activity) => sum + activity.keystrokes, 0)
        const totalIdleMinutes = activitiesForDate.reduce((sum, activity) => sum + activity.idleMinutes, 0)
    
        return [totalMouseClicks, totalKeystrokes, totalIdleMinutes]
    }    

  const getLineChartData = () => {
    return pastActivities.slice(0, 5).map(activity => activity[selectedMetric]).reverse()
  }

  const pieChartData = getPieChartData(selectedDate)
  const lineChartData = getLineChartData()

  const COLORS = ['#1e40af', '#16a34a', '#dc2626']
  const TEXT_COLORS = ['text-blue-800', 'text-green-600', 'text-red-600'];

  const pieChartOptions = {
    chart: {
      type: 'pie',
    },
    labels: ['Mouse Clicks', 'Keystrokes', 'Idle Minutes'],
    colors: COLORS,
    legend: {
      position: 'bottom'
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  }

  const lineChartOptions = {
    chart: {
      type: 'line',
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    xaxis: {
      tooltip: {
        enabled: false
      },
      labels: {
        show: false
      },
      axisTicks: {
        show: false
      },
      title: {
        text: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
        style: {
          fontSize: '12px',
          fontWeight: 600
        }
      },
    },
    yaxis: {
      title: {
        text: 'Count',
        style: {
          fontSize: '12px',
          fontWeight: 600
        }
      },
      labels: {
        formatter: (value) => value.toFixed(0)
      }
    },
    markers: {
      size: 5
    },
    colors: [COLORS[['mouseClicks', 'keystrokes', 'idleMinutes'].indexOf(selectedMetric)]],
    tooltip: {
      marker: {
        show: true
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: () => selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)
        }
      },
      style: {
        fontSize: '12px'
      }
    }
  }

  const lineChartSeries = [
    {
      name: selectedMetric,
      data: lineChartData
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Daily Activity Breakdown Section */}
        <div className="w-full lg:w-1/2">
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
            </div>
          </div>
          <div className="border rounded-lg p-4 px-2 sm:px-4">
            <div className="w-full">
              {pieChartData?.length > 0 ? (
                <div className="h-[300px]">
                  <Chart
                    options={pieChartOptions}
                    series={pieChartData}
                    type="pie"
                    height={300}
                  />
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-center text-gray-600">No data available for the selected date.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Last 5 Activities Comparison Chart */}
        <div className="w-full lg:w-1/2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-4 sm:space-y-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Last 5 Activities</h2>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="block w-44 pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="mouseClicks">Mouse Clicks</option>
              <option value="keystrokes">Keystrokes</option>
              <option value="idleMinutes">Idle Minutes</option>
            </select>
          </div>
          <div className="border rounded-lg p-4 px-2 sm:px-4">
            <div className="w-full">
              <div className="h-[300px]">
                <Chart
                  options={lineChartOptions}
                  series={lineChartSeries}
                  type="line"
                  height={300}
                />
              </div>
            </div>
          </div>
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
  )
} 