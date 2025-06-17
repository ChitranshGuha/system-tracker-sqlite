import { Moon } from 'lucide-react';

const SleepMode = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <Moon
            className="w-24 h-24 text-blue-400 animate-pulse"
            strokeWidth={1.5}
          />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-light text-white">Sleep Mode</h1>
          <p className="text-gray-400 text-lg">Your computer is resting...</p>
        </div>
        <div className="flex justify-center space-x-2 mt-8">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.1s' }}
          ></div>
          <div
            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
            style={{ animationDelay: '0.2s' }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default SleepMode;
