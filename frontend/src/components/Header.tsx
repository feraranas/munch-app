import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import GrapesLogo from './GrapesLogo';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
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

  return (
    <div className="bg-gray-50 ">
      <div className="container mx-auto px-6 py-6">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-5 w-full">
            <GrapesLogo width={48} height={48} />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <div className='flex justify-between items-center w-full'>
                <p className="text-lg text-gray-500">{user?.username || 'Fernando'}</p>
                <p className="text-md text-gray-500">{getCurrentDate()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;

