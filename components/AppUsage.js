import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { gettingAppUsages } from '../redux/employee/employeeActions';
import moment from 'moment';
import { getSystemTimezone } from '../utils/helpers';
import {
  Clock,
  Calendar,
  Monitor,
  ChevronDown,
  Search,
  ArrowUpDown,
  ChevronRight,
  ChevronLeft,
  PieChart,
  Filter,
  BarChart3,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const AppUsage = ({ authToken, ownerId, isOnline }) => {
  const dispatch = useDispatch();
  const [dateFilter, setDateFilter] = useState('today');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'duration',
    direction: 'desc',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [appUsagesData, setAppUsagesData] = useState([]);

  const appUsages = useSelector((state) => state?.employee?.appUsages?.list);

  const getDateRange = (filter) => {
    const endDate = moment().format('YYYY-MM-DD');
    let startDate;

    switch (filter) {
      case 'today':
        startDate = moment().format('YYYY-MM-DD');
        break;
      case '7days':
        startDate = moment().subtract(7, 'days').format('YYYY-MM-DD');
        break;
      case '30days':
        startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
        break;
      case '90days':
        startDate = moment().subtract(90, 'days').format('YYYY-MM-DD');
        break;
      default:
        startDate = moment().format('YYYY-MM-DD');
    }

    return { startDate, endDate };
  };

  useEffect(() => {
    if (authToken && ownerId && isOnline) {
      if (!appUsages || appUsages?.length === 0) {
        const { startDate, endDate } = getDateRange(dateFilter);
        dispatch(
          gettingAppUsages(authToken, {
            ownerId,
            startDate,
            endDate,
            timezone: getSystemTimezone(),
          })
        );
      }
    }
  }, [authToken, ownerId, appUsages]);

  useEffect(() => {
    if (appUsages && appUsages?.length > 0) {
      setAppUsagesData(appUsages);
    }
  }, [appUsages]);

  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return `${seconds} sec`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} min ${seconds % 60} sec`;
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hr ${minutes} min`;
    } else {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return `${days} day${days > 1 ? 's' : ''} ${hours} hr`;
    }
  };

  const formatDate = (dateString) => {
    return moment(dateString).format('MMM DD, YYYY h:mm A');
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    const filteredData = appUsagesData.filter((app) =>
      app.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const sortedData = getSortedData();

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData?.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedData?.length / itemsPerPage);

  const chartData = {
    options: {
      chart: {
        id: 'app-usage-chart',
        toolbar: {
          show: false,
        },
      },
      xaxis: {
        categories: sortedData?.slice(0, 5).map((app) => app.name),
      },
      colors: ['#6366F1'],
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: true,
        },
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        y: {
          formatter: (val) => formatDuration(val),
        },
      },
    },
    series: [
      {
        name: 'Duration',
        data: sortedData?.slice(0, 5).map((app) => app.duration),
      },
    ],
  };

  const calculateSummary = () => {
    if (!sortedData?.length)
      return {
        totalApps: 0,
        totalDuration: 0,
        totalSessions: 0,
        mostUsed: null,
      };

    const totalDuration = sortedData?.reduce(
      (sum, app) => sum + (app.duration || 0),
      0
    );
    const totalSessions = sortedData?.reduce(
      (sum, app) => sum + (app.sessions || 0),
      0
    );

    let mostUsed = null;
    if (sortedData?.length > 0) {
      mostUsed = sortedData?.reduce(
        (max, app) => (!max || app.duration > max.duration ? app : max),
        null
      );
    }

    return {
      totalApps: sortedData?.length,
      totalDuration,
      totalSessions,
      mostUsed,
    };
  };

  const summary = calculateSummary();

  function fetchAppUsageData(dateFilter) {
    const { startDate, endDate } = getDateRange(dateFilter);

    dispatch(
      gettingAppUsages(authToken, {
        ownerId,
        startDate,
        endDate,
        timezone: getSystemTimezone(),
      })
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center mb-4 md:mb-0">
          <Monitor className="mr-2 h-5 w-5 text-indigo-600" />
          App Usage Analytics
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search apps..."
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>

          {isOnline && (
            <div className="relative">
              <button
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg flex items-center justify-between w-full sm:w-40"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <span className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                  {dateFilter === 'today'
                    ? 'Today'
                    : dateFilter === '7days'
                      ? 'Last 7 days'
                      : dateFilter === '30days'
                        ? 'Last 30 days'
                        : 'Last 90 days'}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <ul className="py-1">
                    <li
                      className={`px-4 py-2 hover:bg-indigo-50 cursor-pointer ${dateFilter === 'today' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                      onClick={() => {
                        setDateFilter('today');
                        setIsFilterOpen(false);
                        fetchAppUsageData('today');
                      }}
                    >
                      Today
                    </li>
                    <li
                      className={`px-4 py-2 hover:bg-indigo-50 cursor-pointer ${dateFilter === '7days' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                      onClick={() => {
                        setDateFilter('7days');
                        setIsFilterOpen(false);
                        fetchAppUsageData('7days');
                      }}
                    >
                      Last 7 days
                    </li>
                    <li
                      className={`px-4 py-2 hover:bg-indigo-50 cursor-pointer ${dateFilter === '30days' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                      onClick={() => {
                        setDateFilter('30days');
                        setIsFilterOpen(false);
                        fetchAppUsageData('30days');
                      }}
                    >
                      Last 30 days
                    </li>
                    <li
                      className={`px-4 py-2 hover:bg-indigo-50 cursor-pointer ${dateFilter === '90days' ? 'bg-indigo-50 text-indigo-600' : ''}`}
                      onClick={() => {
                        setDateFilter('90days');
                        setIsFilterOpen(false);
                        fetchAppUsageData('90days');
                      }}
                    >
                      Last 90 days
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-indigo-600 font-medium">
                Total Applications
              </p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {summary.totalApps}
              </h3>
            </div>
            <Monitor className="h-8 w-8 text-indigo-400" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-purple-600 font-medium">
                Total Usage Time
              </p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {formatDuration(summary.totalDuration)}
              </h3>
            </div>
            <Clock className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-pink-50 rounded-lg p-4 border border-pink-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-pink-600 font-medium">
                Total Sessions
              </p>
              <h3 className="text-2xl font-bold text-gray-800 mt-1">
                {summary.totalSessions}
              </h3>
            </div>
            <Filter className="h-8 w-8 text-pink-400" />
          </div>
        </div>

        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-emerald-600 font-medium">
                Most Used App
              </p>
              <h3 className="text-lg font-bold text-gray-800 mt-1 truncate max-w-[180px]">
                {summary.mostUsed?.name || 'N/A'}
              </h3>
              <p className="text-xs text-emerald-600 mt-1">
                {summary.mostUsed
                  ? formatDuration(summary.mostUsed.duration)
                  : ''}
              </p>
            </div>
            <PieChart className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="mb-8 h-64">
        {typeof window !== 'undefined' && (
          <Chart
            options={chartData.options}
            series={chartData.series}
            type="bar"
            height="100%"
          />
        )}
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('name')}
              >
                <div className="flex items-center">
                  Application
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('duration')}
              >
                <div className="flex items-center">
                  Duration
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden md:table-cell"
                onClick={() => requestSort('sessions')}
              >
                <div className="flex items-center">
                  Sessions
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden lg:table-cell"
                onClick={() => requestSort('lastUsed')}
              >
                <div className="flex items-center">
                  Last Used
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hidden xl:table-cell"
                onClick={() => requestSort('firstUsed')}
              >
                <div className="flex items-center">
                  First Used
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentItems.map((app, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-medium">
                        {app.name.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {app.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Clock className="mr-2 h-4 w-4 text-indigo-500" />
                    {formatDuration(app.duration)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                  <div className="flex items-center text-sm text-gray-900">
                    <BarChart3 className="mr-2 h-4 w-4 text-indigo-500" />
                    {app.sessions}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                  {formatDate(app.lastUsed)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                  {formatDate(app.firstUsed)}
                </td>
              </tr>
            ))}

            {currentItems?.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No applications found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sortedData?.length > itemsPerPage && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                <span className="font-medium">
                  {indexOfLastItem > sortedData?.length
                    ? sortedData?.length
                    : indexOfLastItem}
                </span>{' '}
                of <span className="font-medium">{sortedData?.length}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav
                className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                    currentPage === 1 ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        page === currentPage
                          ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                    currentPage === totalPages
                      ? 'cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>

          <div className="flex sm:hidden justify-between w-full">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                currentPage === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${
                currentPage === totalPages
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppUsage;
