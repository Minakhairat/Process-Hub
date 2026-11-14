import React, { useState } from 'react';
import { FRESH_LOGO_URL, OWNER_INFO } from '../data/defaultApps';

interface FreshLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FreshLogo: React.FC<FreshLogoProps> = ({ size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);

  const dims =
    size === 'sm'
      ? 'h-7 min-w-[44px] px-1.5 rounded-md'
      : size === 'lg'
        ? 'h-12 min-w-[76px] px-2.5 rounded-xl'
        : 'h-9 min-w-[56px] px-2 rounded-lg';

  if (imgError) {
    return (
      <div
        className={`${dims} shrink-0 bg-red-600 text-white flex items-center justify-center font-latin font-extrabold tracking-wider text-xs border border-red-700 ${className}`}
        title={OWNER_INFO.companyAr}
      >
        FRESH
      </div>
    );
  }

  return (
    <div
      className={`${dims} shrink-0 bg-white border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center ${className}`}
    >
      <img
        src={FRESH_LOGO_URL}
        alt={OWNER_INFO.companyAr}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="h-full w-auto max-w-full object-contain"
      />
    </div>
  );
};
