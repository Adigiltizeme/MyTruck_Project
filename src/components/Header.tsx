import { BellIcon } from '@heroicons/react/24/outline';

const Header = () => {
  return (
    <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        <button 
          type="button"
          className="text-gray-400 hover:text-gray-600 transition-colors p-2"
          aria-label="Notifications"
        >
          <BellIcon className="h-6 w-6" />
        </button>

        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img
              src="/image-avatar.png"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="ml-3 text-sm text-gray-700">
            Blas Dam's
          </span>
        </div>
      </div>
    </div>
  );
};

export default Header;