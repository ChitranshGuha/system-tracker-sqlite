import { useEffect } from 'react';

const InstructionModal = ({ message, onClose, children }) => {
  useEffect(() => {
    if (!children) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [children, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center">
      <div className="bg-white max-w-md w-full p-5 rounded-xl shadow-lg">
        <div
          className="mb-4"
          style={{ fontSize: '15px' }}
          dangerouslySetInnerHTML={{ __html: message }}
        />
        {children && (
          <div className="flex justify-end space-x-2">{children}</div>
        )}
      </div>
    </div>
  );
};

export default InstructionModal;
