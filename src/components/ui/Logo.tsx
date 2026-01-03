'use client';

import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <div 
      className={className}
      style={{
        width: '402px',
        height: '12px',
        padding: '0 15px',
        background: 'rgba(0, 0, 0, 0.00)',
        flexShrink: 0,
        position: 'fixed',
        top: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img 
        src="/Coex CI_White 2.svg" 
        alt="COEX Logo"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
}

