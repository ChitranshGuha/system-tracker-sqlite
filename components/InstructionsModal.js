import { useEffect } from 'react';
import { X } from 'lucide-react';

const InstructionModal = ({ message, onClose, children }) => {
  useEffect(() => {
    if (!children) {
      const timer = setTimeout(() => {
        onClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [children, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center">
      <div className=" bg-white max-w-md w-full p-4 rounded-xl shadow-lg">
        {!children && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="!m-0 font-bold">Entered Offline Mode</h2>

            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        )}

        <div
          style={{ fontSize: '15px' }}
          dangerouslySetInnerHTML={{ __html: message }}
        />
        {children && (
          <div className="flex justify-end space-x-2 mt-4">{children}</div>
        )}
      </div>
    </div>
  );
};

export default InstructionModal;
