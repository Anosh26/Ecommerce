'use client';

import React from 'react';

interface ProductImageProps {
  id: string;
  name: string;
  category: string;
  className?: string;
}

export default function ProductImage({ id, name, category, className = '' }: ProductImageProps) {
  // Select sunny gradient based on product id or category
  let gradient = 'linear-gradient(135deg, #fffbeb 0%, #fef08a 100%)';
  let icon = null;
  const strokeColor = '#1e293b';

  if (id === 'prod-1') {
    // Headphones - Yellow sunny glow
    gradient = 'linear-gradient(135deg, #fffbeb 0%, #facc15 100%)';
    icon = (
      <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="prod-svg">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    );
  } else if (id === 'prod-2') {
    // Sneakers - Bright lime green
    gradient = 'linear-gradient(135deg, #f7fee7 0%, #a3e635 100%)';
    icon = (
      <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="prod-svg">
        <path d="M3 12h18M3 16h18M4 8h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" />
        <path d="m14 8 2-3 2 3" />
      </svg>
    );
  } else if (id === 'prod-3') {
    // Backpack - Fresh leafy green
    gradient = 'linear-gradient(135deg, #f0fdf4 0%, #4ade80 100%)';
    icon = (
      <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="prod-svg">
        <path d="M4 20V10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        <path d="M8 10h8M8 14h8M12 14v8" />
      </svg>
    );
  } else if (id === 'prod-4') {
    // Keyboard - Orange / Yellow sunburst
    gradient = 'linear-gradient(135deg, #fff7ed 0%, #fdba74 100%)';
    icon = (
      <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="prod-svg">
        <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
      </svg>
    );
  } else if (id === 'prod-5') {
    // Smartwatch - Sunny Yellow & Lime Mix
    gradient = 'linear-gradient(135deg, #fef9c3 0%, #d9f99d 100%)';
    icon = (
      <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="prod-svg">
        <circle cx="12" cy="12" r="7" />
        <path d="M12 9v3l1.5 1.5M16.5 12h.5M7 12h.5M12 5V2M12 19v3" />
      </svg>
    );
  } else if (id === 'prod-6') {
    // Leather Jacket - Emerald Mint
    gradient = 'linear-gradient(135deg, #ecfdf5 0%, #10b981 100%)';
    icon = (
      <svg viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="prod-svg">
        <path d="M4 3h16l2 8-2 10H4L2 11l2-8z" />
        <path d="M12 3v18M4 8h16M4 14h16" />
      </svg>
    );
  }

  return (
    <div 
      className={`prod-image-wrapper ${className}`}
      style={{
        background: gradient,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        aspectRatio: '16/10',
        borderBottom: '3.5px solid #1e293b',
        borderRadius: '0px'
      }}
    >
      {/* Decorative Bold Grid Background */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(30, 41, 59, 0.05) 25%, rgba(30, 41, 59, 0.05) 26%, transparent 27%, transparent 74%, rgba(30, 41, 59, 0.05) 75%, rgba(30, 41, 59, 0.05) 76%, transparent 77%), linear-gradient(90deg, transparent 24%, rgba(30, 41, 59, 0.05) 25%, rgba(30, 41, 59, 0.05) 26%, transparent 27%, transparent 74%, rgba(30, 41, 59, 0.05) 75%, rgba(30, 41, 59, 0.05) 76%, transparent 77%)',
          backgroundSize: '24px 24px',
          opacity: 0.7,
        }}
      />
      <div 
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-20%',
          width: '140%',
          height: '140%',
          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.25) 0%, transparent 60%)',
          pointerEvents: 'none'
        }}
      />
      <div style={{ color: strokeColor, width: '25%', height: '25%', zIndex: 1 }}>
        {icon}
      </div>
    </div>
  );
}
