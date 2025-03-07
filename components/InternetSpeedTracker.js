import { useState, useEffect, useCallback, useRef } from 'react';

export default function InternetSpeedTracker({ socket }) {
  const [speed, setSpeed] = useState(null);
  const [speedClass, setSpeedClass] = useState('');

  const checkSpeed = useCallback(async () => {
    try {
      const url =
        'https://omnichannel.infoware.xyz/uploads/3e33171f73864123a6283d5fd78ad5f0.jpg';

      const startTime = new Date().getTime();

      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const endTime = new Date().getTime();

      const duration = (endTime - startTime) / 1000;
      const fileSizeInBits = blob.size * 8;
      const speedMbps = fileSizeInBits / duration / 1000000;
      const speedBps = fileSizeInBits / duration;

      const formattedSpeed = speedMbps.toFixed(2);
      setSpeed(formattedSpeed);

      if (socket) {
        socket.emit('/internet-speed/add', {
          speed: speedBps,
        });
      }

      if (speedMbps < 2) {
        setSpeedClass('text-red-600');
      } else if (speedMbps >= 30) {
        setSpeedClass('text-green-600');
      } else {
        setSpeedClass('text-yellow-600');
      }
    } catch (error) {
      console.error('Error checking speed:', error);
      setSpeed(null);
    }
  }, [socket, navigator.connection.downlink]);

  useEffect(() => {
    checkSpeed();

    const speedInterval = setInterval(checkSpeed, 2000);

    return () => {
      clearInterval(speedInterval);
    };
  }, [checkSpeed]);

  if (speed === null) {
    return 'Checking...';
  }

  return (
    <span className={`font-bold ${speedClass}`}>
      {speed}
      <span className="text-sm ml-1">
        {Number(speed) < 2
          ? '(Slow)'
          : Number(speed) >= 30
            ? '(Fast)'
            : '(Medium)'}
      </span>
    </span>
  );
}
