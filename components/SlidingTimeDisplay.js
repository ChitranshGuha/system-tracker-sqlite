import { useState, useEffect } from 'react';
import { RefreshCcw, RefreshCw } from 'lucide-react';

export default function SlidingTimeDisplay({
  seconds,
  animate,
  fetchActiveTime,
}) {
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

  // Refresh call
  const [disabled, setDisabled] = useState(false);
  const REFRESH_CALL_TIME = 30 * 60 * 1000;

  useEffect(() => {
    const lastClicked = localStorage.getItem('refreshLastClicked');
    if (lastClicked && Date.now() - Number(lastClicked) < REFRESH_CALL_TIME) {
      setDisabled(true);
      const timer = setTimeout(
        () => setDisabled(false),
        REFRESH_CALL_TIME - (Date.now() - Number(lastClicked))
      );
      return () => clearTimeout(timer);
    }
  }, []);

  const handleRefresh = () => {
    fetchActiveTime();
    setDisabled(true);
    localStorage.setItem('refreshLastClicked', Date.now().toString());
    setTimeout(() => setDisabled(false), REFRESH_CALL_TIME);
  };

  return (
    <div className="relative">
      {!disabled && (
        <button
          onClick={handleRefresh}
          className="absolute -top-5 -right-4 p-1 text-green-800 hover:text-green-600"
          title="Refresh time"
        >
          <RefreshCw />
        </button>
      )}

      <div className="flex items-center text-2xl font-bold sm:text-3xl text-green-900">
        <div className="overflow-hidden">
          {hoursChanged ? (
            <div className="animate-slide-up">{h || 0}</div>
          ) : (
            <div>{h || 0}</div>
          )}
        </div>

        <span className="mx-1">h</span>

        <span className="mx-1">:</span>

        <div className="overflow-hidden">
          {minutesChanged ? (
            <div className="animate-slide-up">{m || 0}</div>
          ) : (
            <div>{m || 0}</div>
          )}
        </div>

        <span className="mx-1">m</span>
      </div>
    </div>
  );
}
