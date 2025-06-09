import { FiPlay, FiSquare } from 'react-icons/fi';

const ActionButtons = ({ isOnline, isLogging, stopLoggingHandler }) => {
  return (
    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-6 lg:space-x-0 lg:grid lg:grid-cols-2 lg:gap-4">
      <button
        type="submit"
        disabled={isLogging || !isOnline}
        title={
          isLogging
            ? 'Activity not stopped yet!'
            : !isOnline
              ? 'Can not start without internet!'
              : ''
        }
        id="start-logging"
        className={`w-full py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center space-x-2 transition-all ${
          isLogging || !isOnline
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 hover:shadow-md'
        }`}
      >
        <FiPlay className="text-xl" />
        <span>Start Logging</span>
      </button>

      <button
        onClick={(e) => {
          e.preventDefault();
          stopLoggingHandler();
        }}
        disabled={!isLogging || !isOnline}
        title={
          !isLogging
            ? 'Activity not started yet!'
            : !isOnline
              ? 'Can not stop without internet!'
              : ''
        }
        type="button"
        id="stop-logging"
        className={`w-full py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center space-x-2 transition-all ${
          !isLogging || !isOnline
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700 hover:shadow-md'
        }`}
      >
        <FiSquare className="text-xl" />
        <span>Stop Logging</span>
      </button>
    </div>
  );
};

export default ActionButtons;
