'use client';

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

const ApiErrorLogger = ({ error, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full animate-in slide-in-from-right">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-red-200 dark:border-red-900 overflow-hidden">
        <div className="bg-red-50 dark:bg-red-900/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
            <h3 className="font-medium text-red-700 dark:text-red-400">
              API Error
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
            <div className="flex items-center">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 w-24">
                Error Code:
              </span>
              <span className="text-sm font-mono bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded text-red-600 dark:text-red-400">
                {error.code}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Error Message:
              </span>
              <p className="text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-100 dark:border-gray-700">
                {error.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiErrorLogger;
