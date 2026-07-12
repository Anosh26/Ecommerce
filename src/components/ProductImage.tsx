'use client';

import React from 'react';

interface ProductImageProps {
  id: string;
  name: string;
  category: string;
  className?: string;
}

export default function ProductImage({ id, name, category, className = '' }: ProductImageProps) {
  // Select gradient based on product id or category
  let gradient = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
  let icon = null;

  if (id === 'prod-1') {
    // Headphones - Indigo & Purple glow
    gradient = 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)';
    icon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="prod-svg">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    );
  } else if (id === 'prod-2') {
    // Sneakers - Orange/Pink Cyber glow
    gradient = 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)';
    icon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="prod-svg">
        <path d="M3 12h18M3 16h18M4 8h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" />
        <path d="m14 8 2-3 2 3" />
      </svg>
    );
  } else if (id === 'prod-3') {
    // Backpack - Emerald/Cyan
    gradient = 'linear-gradient(135deg, #0d9488 0%, #06b6d4 100%)';
    icon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="prod-svg">
        <path d="M4 20V10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        <path d="M8 10h8M8 14h8M12 14v8" />
      </svg>
    );
  } else if (id === 'prod-4') {
    // Keyboard - Blue/Violet Tech
    gradient = 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)';
    icon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="prod-svg">
        <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
      </svg>
    );
  } else if (id === 'prod-5') {
    // Smartwatch - Rose/Purple
    gradient = 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)';
    icon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="prod-svg">
        <circle cx="12" cy="12" r="7" />
        <path d="M12 9v3l1.5 1.5M16.5 12h.5M7 12h.5M12 5V2M12 19v3" />
      </svg>
    );
  } else if (id === 'prod-6') {
    // Leather Jacket - Orange/Gold
    gradient = 'linear-gradient(135deg, #d97706 0%, #dc2626 100%)';
    icon = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="prod-svg">
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
        borderRadius: 'var(--radius-lg)'
      }}
    >
      {/* Decorative Cyber Grid Background */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.05) 75%, rgba(255, 255, 255, 0.05) 76%, transparent 77%), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.05) 75%, rgba(255, 255, 255, 0.05) 76%, transparent 77%)',
          backgroundSize: '20px 20px',
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
          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.15) 0%, transparent 60%)',
          pointerEvents: 'none'
        }}
      />
      <div style={{ color: 'white', width: '25%', height: '25%', zIndex: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
        {icon}
      </div>
      
      <style jsx global>{`
        .prod-svg {
          width: 100%;
          height: 100%;
          transition: transform var(--transition-normal);
        }
        .prod-image-wrapper:hover .prod-svg {
          transform: scale(1.15) rotate(5deg);
        }
      `}</style>
    </div>
  );
}
