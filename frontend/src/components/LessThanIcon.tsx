import React from 'react';

interface LessThanIconProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  fill?: string;
}

const LessThanIcon: React.FC<LessThanIconProps> = ({
  className = '',
  width = 24,
  height = 24,
  fill = '#000000'
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
      <path d="M 26 6 L 6 15.21875 L 6 16.78125 L 26 26 L 26 23.84375 L 9.46875 16 L 26 8.15625 Z" />     
      </g>
    </svg>
  );
};

export default LessThanIcon;

<svg width="800px" height="800px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  
</svg>