import React, { ReactNode } from 'react';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
}

export default function GradientText({
  children,
  className = '',
  colors = ['#ffffff', '#9c40ff', '#ffffff'],
  animationSpeed = 8,
  showBorder = false
}: GradientTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(to right, ${colors.join(', ')})`,
    animationDuration: `${animationSpeed}s`
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
      }}
    >
      <span
        className="inline-block text-transparent animate-gradient"
        style={{
          ...gradientStyle,
          backgroundSize: '300% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }}
      >
        {children}
      </span>
    </div>
  );
}

