import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import moment from 'moment';
import { useSelector,useDispatch } from 'react-redux';
import { gettingEmployeeActionsList } from '../redux/employee/employeeActions';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

export default function PastActivities({authToken,ownerId}) {
  const dispatch = useDispatch();

  const [selectedMetric, setSelectedMetric] = useState('mouseClick');
  const pastActivities = useSelector(state => state?.employee?.activities?.list);

  useEffect(() => {
    dispatch(gettingEmployeeActionsList(authToken,"employee/project/project/task/activity/list","activities",{ownerId}))
  },[])

  const getLineChartData = () => {
    return pastActivities.slice(0, 5).map(activity => activity[selectedMetric]).reverse()
  }

  const lineChartData = getLineChartData()

  const COLORS = ['#1e40af', '#16a34a', '#dc2626']
  const TEXT_COLORS = ['text-blue-800', 'text-green-600', 'text-red-600'];

  const pieChartOptions = {
    chart: {
      type: 'pie',
    },
    labels: ['Mouse Clicks', 'Keystroke', 'Idle Minutes'],
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
    colors: [COLORS[['mouseClick', 'keystroke', 'idleTime'].indexOf(selectedMetric)]],
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
      {/* Last 5 Activities Comparison Chart */}
      <div className="w-full lg:w-1/2 mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-4 sm:space-y-0">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Last 5 Activities</h2>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="block w-44 pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="mouseClick">Mouse Clicks</option>
            <option value="keystroke">Keystroke</option>
            <option value="idleTime">Idle Minutes</option>
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

      {/* Project Activity Section */}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-6">Project Activities</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 shadow-sm rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">End Time</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Duration ( in min. )</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Mouse Clicks</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Keystroke</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Idle Minutes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pastActivities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold whitespace-nowrap">{activity.projectTask?.name}</td>
                  <td className="px-4 py-3 font-bold whitespace-nowrap">{activity.projectTask?.project?.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {activity.startTime ? 
                      <>{moment(activity.startTime).format('hh:mm A')}<br/>{moment(activity.startTime).format('DD MMM, YYYY')}</>
                      : "-"
                    }
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {activity.endTime ? 
                      <>{moment(activity.endTime).format('hh:mm A')}<br/>{moment(activity.endTime).format('DD MMM, YYYY')}</>
                      : "-"
                    }
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">{Number(activity.totalTime / 60).toFixed(2)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap text-center ${TEXT_COLORS[0]}`}>{activity.mouseClick}</td>
                  <td className={`px-4 py-3 whitespace-nowrap text-center ${TEXT_COLORS[1]}`}>{activity.keystroke}</td>
                  <td className={`px-4 py-3 whitespace-nowrap text-center ${TEXT_COLORS[2]}`}>{activity.idleTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 