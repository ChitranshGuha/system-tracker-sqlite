export default function Loader({ isLoading, children }) {
  return (
    <div className="relative">
      {children}

      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex space-x-2 items-center justify-center">
            <div
              className="w-4 h-4 bg-white rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></div>
            <div
              className="w-4 h-4 bg-white rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></div>
            <div
              className="w-4 h-4 bg-white rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
