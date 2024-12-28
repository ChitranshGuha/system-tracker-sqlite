import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FiMousePointer, FiClock, FiActivity } from "react-icons/fi";
import { BsKeyboard } from "react-icons/bs";
import { X } from "lucide-react";
import Task from "./Task/Task";
import PastActivities from "./PastActivities";
import { gettingEmployeeActionsList } from "../redux/employee/employeeActions";
import io from "socket.io-client";

function ActivityLogger({
  onLogout,
  stats,
  startLogging,
  stopLogging,
  isLogging,
  captureInterval,
  authToken,
  activityInterval,
}) {
  const dispatch = useDispatch();

  const [ownerId, setOwnerId] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    dispatch(
      gettingEmployeeActionsList(
        authToken,
        "employee/auth/workspace/list",
        "workspaces"
      )
    );
  }, []);

  useEffect(() => {
    if (ownerId && authToken) {
      const socketInstance = io(
        `https://webtracker.infoware.xyz/employee?token=${authToken}&ownerId=${ownerId}`
      );
      setSocket(socketInstance);

      socketInstance.on("connect", () => {
        console.log("Socket connection successful!");
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Socket connection error:", error, socketInstance);
      });

      return () => {
        socketInstance.disconnect();
      };
    }
  }, [ownerId, authToken]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState("current");
  const [activeSession, setActiveSession] = useState(null);
  const user = useSelector((state) => state?.auth?.employeeDetails);

  const workspaces = useSelector((state) => state?.employee?.workspaces?.list);

  const handleLogout = () => {
    onLogout();
    setShowLogoutModal(false);
  };

  useEffect(() => {
    if (workspaces && workspaces?.length !== 0) {
      const workspaceOwnerId = workspaces?.[workspaces.length - 1]?.ownerId;
      setOwnerId(workspaceOwnerId);
      localStorage.setItem("ownerId", workspaceOwnerId);
    }
  }, [workspaces]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedIsLogging = JSON.parse(localStorage.getItem("isLogging"));
      const storedOwnerId = localStorage.getItem("ownerId");
      const storedActiveSession = localStorage.getItem("activeSession");
      if (storedIsLogging) {
        if (storedOwnerId) {
          setOwnerId(storedOwnerId);
        }
        if (storedActiveSession) {
          setActiveSession(JSON.parse(storedActiveSession));
        }
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-4 sm:p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Activity Logger
            </h1>
            <FiActivity className="text-indigo-600 text-xl sm:text-3xl ml-2" />
          </div>

          <div className="flex items-center space-x-4">
            {/* {ownerId ? (
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.ownerId} value={workspace.ownerId}>
                    {workspace.workspaceName}
                  </option>
                ))}
              </select>
            ) : null} */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-semibold cursor-pointer transition-transform hover:scale-105"
              style={{ backgroundColor: "#059669" }}
              onClick={() => setShowLogoutModal(true)}
            >
              {user?.firstName?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>

        {ownerId ? (
          <>
            {/* Tabs */}
            <div className="flex mb-6">
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "current"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
                onClick={() => setActiveTab("current")}
              >
                Active Tab Session
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm ${
                  activeTab === "past"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
                onClick={() => setActiveTab("past")}
              >
                Past Activities
              </button>
            </div>

            {activeTab === "current" ? (
              <>
                <Task
                  startLogging={startLogging}
                  stopLogging={stopLogging}
                  isLogging={isLogging}
                  activeSession={activeSession}
                  setActiveSession={setActiveSession}
                  ownerId={ownerId}
                  authToken={authToken}
                  stats={stats}
                  activityInterval={activityInterval}
                  socket={socket}
                />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <FiMousePointer className="text-blue-600 text-xl sm:text-2xl" />
                      <p className="text-2xl sm:text-3xl font-bold text-blue-800">
                        {stats.clickCount}
                      </p>
                    </div>
                    <p className="text-sm text-blue-600 font-medium">
                      Mouse Clicks
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <BsKeyboard className="text-green-600 text-xl sm:text-2xl" />
                      <p className="text-2xl sm:text-3xl font-bold text-green-800">
                        {stats.keyCount}
                      </p>
                    </div>
                    <p className="text-sm text-green-600 font-medium">
                      Keystrokes
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <FiClock className="text-red-600 text-xl sm:text-2xl" />
                      <p className="text-2xl sm:text-3xl font-bold text-red-800">
                        {stats.idleTime}
                      </p>
                    </div>
                    <p className="text-sm text-red-600 font-medium">
                      Idle Time (min)
                    </p>
                  </div>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 sm:p-6 rounded-xl shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
                      <div className="flex items-center">
                        <FiActivity className="text-purple-600 text-lg sm:text-xl mr-2" />
                        <p className="text-base sm:text-lg font-medium text-gray-700">
                          Last Active
                        </p>
                      </div>
                      <p className="text-base sm:text-lg font-bold text-indigo-600">
                        {stats.lastActive || "--"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 sm:p-6 rounded-xl shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
                      <div className="flex items-center">
                        <FiClock className="text-indigo-600 text-lg sm:text-xl mr-2" />
                        <p className="text-base sm:text-lg font-medium text-gray-700">
                          Capture Interval
                        </p>
                      </div>
                      <p className="text-base sm:text-lg font-bold text-indigo-600">
                        {captureInterval}{" "}
                        {captureInterval <= 1 ? "minute" : "minutes"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Keys Pressed Section */}
                {/* <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 rounded-xl shadow-sm mb-6 min-h-[300px] sm:min-h-[400px] overflow-y-auto">
                  <div className="flex items-center mb-3">
                    <BsKeyboard className="text-gray-600 text-lg sm:text-xl mr-2" />
                    <h2 className="font-semibold text-gray-700 text-base sm:text-lg">
                      Keys pressed:
                    </h2>
                  </div>
                  <p className="whitespace-normal break-words text-gray-600 text-sm sm:text-base">
                    {stats.accumulatedText}
                  </p>
                </div> */}
              </>
            ) : (
              <PastActivities authToken={authToken} ownerId={ownerId} />
            )}
          </>
        ) : (
          <div className="flex justify-center items-center h-64">
            {/* <select
              onChange={(e) => setOwnerId(e.target.value)}
              className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
            >
              <option value="">Select a workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace.ownerId} value={workspace.ownerId}>
                  {workspace.workspaceName}
                </option>
              ))}
            </select> */}
          </div>
        )}
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">
                Confirm Logout
              </h2>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-600 mb-4">
                Are you sure you want to logout?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityLogger;
