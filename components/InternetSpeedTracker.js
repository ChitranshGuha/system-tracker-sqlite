import { useState, useEffect, useCallback } from 'react';
import { getSpeed } from '../utils/helpers';

export default function InternetSpeedTracker({ socket, interval }) {
  const [speed, setSpeed] = useState(null);
  const [speedClass, setSpeedClass] = useState('');

  const checkSpeed = useCallback(async () => {
    try {
      const speed = await getSpeed();
      const geoLocation = await window.electronAPI.getGeoLocation();

      const speedMbps = speed / 1000000;

      const formattedSpeed = speedMbps.toFixed(2);
      setSpeed(formattedSpeed);

      if (socket) {
        socket.emit('/internet-speed/add', {
          speed,
          ...geoLocation,
        });
      }

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
  }, [socket]);

  useEffect(() => {
    if (interval) {
      checkSpeed();
      const speedInterval = setInterval(checkSpeed, interval * 1000);

      return () => {
        clearInterval(speedInterval);
      };
    }
  }, [checkSpeed, interval]);

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
