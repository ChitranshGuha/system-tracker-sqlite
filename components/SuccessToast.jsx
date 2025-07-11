'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

const ApiSuccessLogger = ({ message, title, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    const timer = setTimeout(handleClose, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full animate-in slide-in-from-right">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-green-200 dark:border-green-900 overflow-hidden">
        <div className="bg-green-50 dark:bg-green-900/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
            <h3 className="font-medium text-green-700 dark:text-green-400">
              {title}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Message:
            </span>
            <p className="text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-100 dark:border-gray-700">
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiSuccessLogger;
