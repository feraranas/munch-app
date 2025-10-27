import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import GrapesLogo from './GrapesLogo';

interface HeaderProps {
  title: string;
  showUserInfo?: boolean;
  showLogo?: boolean;
  onBackClick?: () => void;
  statusBadge?: {
    text: string;
    colorClass: string;
    size?: 'sm' | 'md' | 'lg';
  };
  actionButton?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  showUserInfo = true, 
  showLogo = true,
  onBackClick,
  statusBadge,
  actionButton
}) => {
  const { user } = useAuth();

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).split(' ').map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
    ).join(' ');
  };

  const getStatusBadgeSizeClasses = (size?: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      case 'md':
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  // POSView mode (with back button and status badge)
  if (onBackClick || statusBadge) {
    return (
      <div className="bg-gray-50 border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 items-center py-4 gap-4">
            {/* Left: Back button + Logo + Title */}
            <div className="flex items-center justify-start gap-3">
              {onBackClick && (
                <button
                  onClick={onBackClick}
                  className="bg-transparent border-none cursor-pointer hover:bg-gray-200 rounded p-1 transition-colors duration-200"
                >
                  <svg width="15" height="20" viewBox="0 0 15 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.5 2.5L5 10L12.5 17.5" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              {showLogo && <GrapesLogo width={32} height={32} />}
              <h1 className="m-0 text-xl font-bold text-black-700">{title}</h1>
            </div>

            {/* Center: Status badge */}
            <div className="flex justify-center">
              {statusBadge && (
                <div className={`rounded-sm text-white font-medium text-center ${getStatusBadgeSizeClasses(statusBadge.size)} ${statusBadge.colorClass}`}>
                  {statusBadge.text}
                </div>
              )}
            </div>

            {/* Right: Action button or empty space for grid balance */}
            <div className="flex justify-end">
              {actionButton}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard mode (with logo, username, and date)
  return (
    <div className="bg-gray-50 border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-6 py-6">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-5 w-full">
            {showLogo && <GrapesLogo width={48} height={48} />}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {showUserInfo && (
                <div className='flex justify-between items-center w-full'>
                  <p className="text-lg text-gray-500">{user?.username || 'Fernando'}</p>
                  <p className="text-md text-gray-500">{getCurrentDate()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;

