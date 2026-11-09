import React from 'react';
import apEmblem from '../../assets/ap-emblem.png';

/**
 * Andhra Pradesh State Emblem Seal
 * Displays the official Government of Andhra Pradesh Emblem
 */
export const ApGovernmentSeal: React.FC<{ className?: string; alt?: string }> = ({
  className = 'w-9 h-9',
  alt = 'Government of Andhra Pradesh',
}) => {
  return (
    <img
      src={apEmblem}
      alt={alt}
      className={`object-contain shrink-0 ${className}`}
      loading="eager"
    />
  );
};

/**
 * Godavari Pushkaralu Kalash Emblem
 * Represents the holy river pilgrimage & festival of Godavari
 */
export const PushkaraluKalash: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="kalashGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#E87512" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#FEF08A" />
        </linearGradient>
      </defs>
      
      {/* Sacred Flame (Deepam) */}
      <path
        d="M50 14 C44 24, 42 30, 47 36 C50 39, 53 36, 54 31 C57 37, 60 38, 56 42 C51 45, 45 42, 44 38 C40 44, 46 50, 50 50 C57 50, 62 43, 60 34 C58 24, 53 18, 50 14 Z"
        fill="url(#flameGrad)"
      />
      
      {/* Coconut / Top vessel lid */}
      <ellipse cx="50" cy="46" rx="14" ry="5" fill="#E87512" />
      <path d="M43 45 Q50 35 57 45 Z" fill="#8F2D16" />
      
      {/* Kalash Pot Body */}
      <path
        d="M34 52 C32 68, 38 78, 50 78 C62 78, 68 68, 66 52 C64 48, 36 48, 34 52 Z"
        fill="url(#kalashGold)"
      />
      
      {/* Sacred Water Ripples / River Godavari motif */}
      <path
        d="M36 62 Q43 65 50 62 Q57 59 64 62"
        stroke="#8F2D16"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M38 69 Q44 72 50 69 Q56 66 62 69"
        stroke="#8F2D16"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Kalash Stand */}
      <path d="M42 78 L40 84 Q50 87 60 84 L58 78 Z" fill="#B45309" />
    </svg>
  );
};

/**
 * CivicProof Lotus & Flame Logo (as shown on the left sidebar header in the reference)
 */
export const CivicProofLotusLogo: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="civicLotus" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FCE4CB" />
        </linearGradient>
        <linearGradient id="civicFlame" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#E87512" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
      </defs>
      
      {/* Inner Flame */}
      <path
        d="M50 18 C46 27, 44 32, 48 38 C51 42, 55 38, 54 32 C57 36, 58 40, 54 44 C51 46, 47 43, 46 39 C42 46, 48 51, 50 51 C55 51, 60 44, 58 35 C56 25, 52 21, 50 18 Z"
        fill="url(#civicFlame)"
      />
      
      {/* Center Lotus Petal */}
      <path
        d="M50 36 C42 48, 42 62, 50 68 C58 62, 58 48, 50 36 Z"
        fill="url(#civicLotus)"
        opacity="0.95"
      />
      
      {/* Left Petal */}
      <path
        d="M48 46 C34 50, 26 62, 34 72 C42 74, 47 64, 48 46 Z"
        fill="url(#civicLotus)"
        opacity="0.85"
      />
      
      {/* Right Petal */}
      <path
        d="M52 46 C66 50, 74 62, 66 72 C58 74, 53 64, 52 46 Z"
        fill="url(#civicLotus)"
        opacity="0.85"
      />
      
      {/* Bottom Horizontal Waves / Water Platform */}
      <path
        d="M20 78 Q35 83 50 78 Q65 73 80 78"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M26 86 Q38 90 50 86 Q62 82 74 86"
        stroke="#FCE4CB"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
    </svg>
  );
};

