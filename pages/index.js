import React, { useState, useEffect } from 'react';
import Login from '../components/Login';
import Dashboard from '../components/Dashboard';
import moment from 'moment';

const VALID_USERS = [
  { mobile: '9999999999', password: '123456', name: 'John', color: '#4f46e5' },
  { mobile: '8888888888', password: '123456', name: 'Alice', color: '#059669' },
  { mobile: '7777777777', password: '123456', name: 'Bob', color: '#dc2626' },
  { mobile: '6666666666', password: '123456', name: 'Emma', color: '#7c3aed' }
];

function ActivityLogger() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const [isLogging, setIsLogging] = useState(false);
  const [captureInterval, setCaptureInterval] = useState(1);

  const initialStats = { 
    clickCount: 0, 
    keyCount: 0, 
    idleTime: 0, 
    accumulatedText: '', 
    lastActive: moment(Date.now()).format('hh:mm:ss A'),  
  };

  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    const storedMobile = localStorage.getItem('userMobile');
    if (storedMobile) {
      const foundUser = VALID_USERS.find(u => u.mobile === storedMobile);
      if (foundUser) {
        setIsLoggedIn(true);
        setUser(foundUser);
      }
    }

    if (typeof window !== 'undefined' && window?.electronAPI) {
      window.electronAPI.getCaptureInterval((interval) => {
        setCaptureInterval(interval);
      });
    }
  }, []);

  const handleLogin = (loggedInUser) => {
    setIsLoggedIn(true);
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    stopLogging();
    setStats(initialStats);
    localStorage.removeItem('userMobile');
  };

  useEffect(() => {
    const handleStatsUpdate = (stats) => {
      setStats(stats);
    };

    if (typeof window !== 'undefined' && window?.electronAPI) {
      window?.electronAPI?.onUpdateStats(handleStatsUpdate);
    }

    return () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        window?.electronAPI?.offUpdateStats(handleStatsUpdate);
      }
    };
  }, []);

  const startLogging = () => {
    if (!isLogging && typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.startLogging();
      setIsLogging(true);
      setStats(initialStats);
    }
  };

  const stopLogging = () => {
    if (isLogging && typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.stopLogging();
      setIsLogging(false);
    }
  };

  return (
    <>
      {!isLoggedIn ? (
        <Login 
          onLogin={handleLogin} 
          VALID_USERS={VALID_USERS}
        />
      ) : (
        <Dashboard 
          user={user} 
          onLogout={handleLogout}
          stats={stats}
          startLogging={startLogging}
          stopLogging={stopLogging}
          isLogging={isLogging}
          captureInterval={captureInterval}
        />
      )}
    </>
  );
}

export default ActivityLogger;