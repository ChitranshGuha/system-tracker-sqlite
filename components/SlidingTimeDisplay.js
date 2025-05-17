import { useState, useEffect } from 'react';

export default function SlidingTimeDisplay({ seconds, animate }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const [prevHours, setPrevHours] = useState(h);
  const [prevMinutes, setPrevMinutes] = useState(m);
  const [hoursChanged, setHoursChanged] = useState(false);
  const [minutesChanged, setMinutesChanged] = useState(false);

  useEffect(() => {
    if (animate) {
      if (h !== prevHours) {
        setHoursChanged(true);
        setTimeout(() => setHoursChanged(false), 300);
        setPrevHours(h);
      }

      if (m !== prevMinutes) {
        setMinutesChanged(true);
        setTimeout(() => setMinutesChanged(false), 300);
        setPrevMinutes(m);
      }
    }
  }, [h, m, animate, prevHours, prevMinutes]);

  return (
    <div className="flex items-center text-2xl font-bold sm:text-3xl text-green-900">
      <div className="overflow-hidden">
        {hoursChanged ? (
          <div className="animate-slide-up">{h}</div>
        ) : (
          <div>{h}</div>
        )}
      </div>

      <span className="mx-1">h</span>

      <span className="mx-1">:</span>

      <div className="overflow-hidden">
        {minutesChanged ? (
          <div className="animate-slide-up">{m}</div>
        ) : (
          <div>{m}</div>
        )}
      </div>

      <span className="mx-1">m</span>
    </div>
  );
}
