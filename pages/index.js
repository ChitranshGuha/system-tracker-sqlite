import React, { useState, useEffect } from "react";
import Login from "../components/Login";
import Dashboard from "../components/Dashboard";
import moment from "moment";
import { useSelector, useDispatch } from "react-redux";
import { getAuthDetails, logOutEmployee } from "../redux/auth/authActions";

function ActivityLogger() {
  const dispatch = useDispatch();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [isLogging, setIsLogging] = useState(false);
  const [captureInterval, setCaptureInterval] = useState(1);
  const [activityInterval, setActivityInterval] = useState(1);
  const authToken = useSelector((state) => state?.auth?.authToken);

  useEffect(() => {
    dispatch(getAuthDetails());
  }, []);

  useEffect(() => {
    if (authToken !== null) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [authToken]);

  const initialStats = {
    clickCount: 0,
    keyCount: 0,
    idleTime: 0,
    accumulatedText: "",
    lastActive: moment(Date.now()).format("hh:mm:ss A"),
  };

  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    if (typeof window !== "undefined" && window?.electronAPI) {
      window.electronAPI.getCaptureInterval((interval) => {
        setCaptureInterval(interval);
      });

      window.electronAPI.getActivityInterval((interval) => {
        setActivityInterval(interval);
      });
    }
  }, [authToken]);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    stopLogging();
    window.electronAPI.sendUserData({ authToken: null });
    setStats(initialStats);
    dispatch(logOutEmployee());
  };

  useEffect(() => {
    const handleStatsUpdate = (stats) => {
      setStats(stats);
    };

    if (typeof window !== "undefined" && window?.electronAPI) {
      window?.electronAPI?.onUpdateStats(handleStatsUpdate);
      window.electronAPI.getInitialStats().then(handleStatsUpdate);
    }

    return () => {
      if (typeof window !== "undefined" && window.electronAPI) {
        window?.electronAPI?.offUpdateStats(handleStatsUpdate);
      }
    };
  }, []);

  const startLogging = () => {
    if (!isLogging && typeof window !== "undefined" && window.electronAPI) {
      window.electronAPI.startLogging();
      setIsLogging(true);
      setStats(initialStats);
      localStorage.setItem("isLogging", JSON.stringify(true));
    }
  };

  const stopLogging = () => {
    if (isLogging && typeof window !== "undefined" && window.electronAPI) {
      window.electronAPI.stopLogging();
      setIsLogging(false);
      localStorage.setItem("isLogging", JSON.stringify(false));
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedIsLogging = JSON.parse(localStorage.getItem("isLogging"));
      if (storedIsLogging) {
        setIsLogging(storedIsLogging);
        window.electronAPI.restartLogging();
      }
    }
  }, []);

  return (
    <>
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard
          onLogout={handleLogout}
          stats={stats}
          startLogging={startLogging}
          stopLogging={stopLogging}
          isLogging={isLogging}
          captureInterval={captureInterval}
          activityInterval={activityInterval}
          authToken={authToken}
        />
      )}
    </>
  );
}

export default ActivityLogger;
