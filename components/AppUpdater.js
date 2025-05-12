import React, { useEffect } from 'react';
import { Download, Calendar, Tag, X } from 'lucide-react';
import moment from 'moment';
import { APP_DOWNLOAD_URL } from '../utils/constants';

const AppUpdater = ({ updateData, onClose, isLogging, isLoggedIn }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  if (!updateData) return null;

  const { version, releaseDate, domainId } = updateData;

  const updateSteps = [
    'Do not close the app until the app has been downloaded.',
    'Uninstall the current version and then install the downloaded version',
    'Relogin and start logging the activity again',
  ];

  const isAllowDownload = isLogging || isLoggedIn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col animate-fadeIn">
        <div className="p-5 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            New Update Available
          </h2>

          <div className="pt-2">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Tag className="mr-1 h-4 w-4" />
                Version {version}
              </div>
              <div className="flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                {moment(releaseDate).format('Do MMM, YY')}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-grow">
          {isAllowDownload ? (
            <h3 className="font-medium text-gray-900 mb-2">
              Mandatory steps required:
            </h3>
          ) : null}

          {isAllowDownload && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm space-y-1">
              {isLogging && <div>⚠️ Please stop the current activity.</div>}
              {isLoggedIn && <div>⚠️ Please log yourself out.</div>}
            </div>
          )}

          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">
              For smooth update transitioning, please:
            </h3>
            <ol className="space-y-2 list-decimal pl-5">
              {updateSteps.map((step, index) => (
                <li key={index} className="text-gray-700">
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex space-x-2 mt-4">
            <button
              className="w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              onClick={onClose}
            >
              Skip for now
            </button>

            <a
              href={
                isAllowDownload
                  ? undefined
                  : APP_DOWNLOAD_URL(domainId, version)
              }
              download
              className="block w-full"
              onClick={(e) => isAllowDownload && e.preventDefault()}
            >
              <button
                className={`w-full py-3 px-4 rounded-md flex items-center justify-center font-medium transition-colors duration-200 ${
                  isAllowDownload
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white'
                }`}
                disabled={isAllowDownload}
              >
                <Download className="mr-2 h-5 w-5" />
                Download v{version}
              </button>
            </a>
          </div>
        </div>

        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default AppUpdater;
