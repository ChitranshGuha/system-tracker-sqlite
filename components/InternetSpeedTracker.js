import { useState, useEffect, useCallback, useRef } from 'react';
import { getSpeed } from '../utils/helpers';

export default function InternetSpeedTracker({
  isOnline,
  socket,
  interval,
  isLogging,
  setInitialSpeed,
}) {
  if (!isOnline) {
    return <span className={`text-red-600`}>Offline</span>;
  }

  const [speed, setSpeed] = useState(null);
  const [speedClass, setSpeedClass] = useState('');
  const speedIntervalRef = useRef(null);

  const checkSpeed = useCallback(async () => {
    if (socket && isOnline) {
      try {
        const speed = await getSpeed();
        setInitialSpeed(speed);
        const geoLocation = await window.electronAPI.getGeoLocation();

        const speedMbps = speed / 1000000;

        const formattedSpeed = speedMbps.toFixed(2);
        setSpeed(formattedSpeed);

        socket.emit('/internet-speed/add', {
          speed,
          ...geoLocation,
        });

        if (speedMbps < 2) {
          setSpeedClass('text-red-600');
        } else if (speedMbps >= 20) {
          setSpeedClass('text-green-600');
        } else {
          setSpeedClass('text-yellow-600');
        }
      } catch (error) {
        console.error('Error checking speed:', error);
        setSpeed(null);
      }
    }
  }, [socket, isOnline]);

  useEffect(() => {
    if (interval && isLogging && isOnline) {
      if (!speed) checkSpeed();

      const speedInterval = setInterval(checkSpeed, interval * 1000);
      speedIntervalRef.current = speedInterval;

      return () => {
        clearInterval(speedInterval);
        speedIntervalRef.current = null;
      };
    } else if (!isLogging) {
      if (!speed) checkSpeed();
      clearInterval(speedIntervalRef.current);
      speedIntervalRef.current = null;
    }
  }, [checkSpeed, isLogging, interval, speed, isOnline]);

  if (speed === null) {
    return 'Checking...';
  }

  return (
    <span className={`font-bold ${speedClass}`}>
      {speed}
      <span className="text-sm ml-1">
        {Number(speed) < 2
          ? '(Slow)'
          : Number(speed) >= 20
            ? '(Fast)'
            : '(Medium)'}
      </span>
    </span>
  );
}
