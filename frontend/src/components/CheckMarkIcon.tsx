import React from 'react';

interface CheckMarkIconProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  fill?: string;
}

const CheckMarkIcon: React.FC<CheckMarkIconProps> = ({ 
  className = '', 
  width = 24, 
  height = 24, 
  fill = '#000000' 
}) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 1920 1920" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M1743.858 267.012 710.747 1300.124 176.005 765.382 0 941.387l710.747 710.871 1209.24-1209.116z" 
        fillRule="evenodd"
        fill={fill}
      />
    </svg>
  );
};

export default CheckMarkIcon;
