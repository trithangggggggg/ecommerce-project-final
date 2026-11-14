import React from 'react';

interface BrandLogoProps {
  brandName: string;
  logoUrl?: string | null;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ brandName, logoUrl, className = 'w-full h-full' }) => {
  const norm = (brandName || '').toLowerCase().trim();

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={brandName}
        className={`${className} object-contain`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  // Apple
  if (norm.includes('apple')) {
    return (
      <svg viewBox="0 0 170 170" className={`${className} text-gray-900 fill-current`}>
        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.75-11.97-14.13-6.97-10.45-12.28-22.38-15.93-35.8-3.65-13.41-5.48-25.96-5.48-37.64 0-14.67 3.75-26.68 11.24-36.03 7.5-9.35 16.9-14.13 28.2-14.35 5.06 0 10.45 1.25 16.18 3.74 5.73 2.5 9.53 3.86 11.41 4.09 1.48-.11 5.37-1.47 11.66-4.09 6.29-2.61 11.62-3.79 15.99-3.53 12.06.66 21.6 4.96 28.61 12.92-10.43 6.31-15.54 15.22-15.33 26.74.22 9.02 3.65 16.74 10.28 23.15 6.64 6.41 14.63 10.05 23.98 10.92-2.18 6.74-4.89 13.6-8.14 20.59zM119.22 33.64c0-7.39 2.65-14.46 7.95-21.21 5.3-6.74 11.83-11.2 19.59-13.38.33 1.09.5 2.18.5 3.26 0 7.39-2.73 14.4-8.19 21.03-5.46 6.63-12.09 10.93-19.89 12.89-.11-.87-.16-1.74-.16-2.59z" />
      </svg>
    );
  }

  // ASUS
  if (norm.includes('asus')) {
    return (
      <svg viewBox="0 0 120 40" className={className}>
        <text
          x="50%"
          y="68%"
          textAnchor="middle"
          fill="#00539b"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="28"
          letterSpacing="1"
        >
          ASUS
        </text>
      </svg>
    );
  }

  // Samsung
  if (norm.includes('samsung')) {
    return (
      <svg viewBox="0 0 140 40" className={className}>
        <text
          x="50%"
          y="68%"
          textAnchor="middle"
          fill="#1428a0"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="20"
          letterSpacing="1.5"
        >
          SAMSUNG
        </text>
      </svg>
    );
  }

  // Sony
  if (norm.includes('sony')) {
    return (
      <svg viewBox="0 0 120 40" className={className}>
        <text
          x="50%"
          y="70%"
          textAnchor="middle"
          fill="#000000"
          fontFamily="Georgia, serif"
          fontWeight="900"
          fontSize="24"
          letterSpacing="2.5"
        >
          SONY
        </text>
      </svg>
    );
  }

  // Dell
  if (norm.includes('dell')) {
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <circle cx="50" cy="50" r="44" fill="none" stroke="#007db8" strokeWidth="6" />
        <text
          x="50"
          y="62"
          textAnchor="middle"
          fill="#007db8"
          fontFamily="system-ui, sans-serif"
          fontWeight="900"
          fontSize="30"
          letterSpacing="-0.5"
        >
          DELL
        </text>
      </svg>
    );
  }

  // Razer
  if (norm.includes('razer')) {
    return (
      <svg viewBox="0 0 120 60" className={className}>
        <path
          d="M60 8 C40 18 35 32 45 48 C50 40 55 35 60 40 C65 35 70 40 75 48 C85 32 80 18 60 8 Z"
          fill="#00e700"
        />
        <circle cx="53" cy="24" r="3" fill="#000" />
        <circle cx="67" cy="24" r="3" fill="#000" />
      </svg>
    );
  }

  // Xiaomi
  if (norm.includes('xiaomi')) {
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <rect x="10" y="10" width="80" height="80" rx="22" fill="#ff6900" />
        <text
          x="50"
          y="66"
          textAnchor="middle"
          fill="#ffffff"
          fontFamily="system-ui, sans-serif"
          fontWeight="900"
          fontSize="42"
        >
          mi
        </text>
      </svg>
    );
  }

  // Logitech
  if (norm.includes('logitech')) {
    return (
      <svg viewBox="0 0 100 100" className={className}>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#111827" strokeWidth="12" />
        <path d="M50 25 A 25 25 0 0 1 75 50 L 50 50 Z" fill="#111827" />
        <text
          x="50"
          y="62"
          textAnchor="middle"
          fill="#111827"
          fontFamily="system-ui, sans-serif"
          fontWeight="900"
          fontSize="34"
        >
          G
        </text>
      </svg>
    );
  }

  // Anker
  if (norm.includes('anker')) {
    return (
      <svg viewBox="0 0 120 40" className={className}>
        <text
          x="50%"
          y="68%"
          textAnchor="middle"
          fill="#00a4e4"
          fontFamily="system-ui, sans-serif"
          fontWeight="900"
          fontSize="24"
          letterSpacing="1"
        >
          ANKER
        </text>
      </svg>
    );
  }

  // HyperX
  if (norm.includes('hyperx') || norm.includes('hypertech') || norm.includes('ht')) {
    return (
      <svg viewBox="0 0 120 50" className={className}>
        <text
          x="50%"
          y="70%"
          textAnchor="middle"
          fill="#e21836"
          fontFamily="Impact, sans-serif"
          fontStyle="italic"
          fontWeight="900"
          fontSize="36"
          letterSpacing="1"
        >
          HT
        </text>
      </svg>
    );
  }

  // XP-Pen / XPG
  if (norm.includes('xp-pen') || norm.includes('xpg') || norm.includes('xp')) {
    return (
      <svg viewBox="0 0 120 50" className={className}>
        <text
          x="50%"
          y="70%"
          textAnchor="middle"
          fill="#e11d48"
          fontFamily="Impact, sans-serif"
          fontStyle="italic"
          fontWeight="900"
          fontSize="32"
          letterSpacing="1"
        >
          XPG
        </text>
      </svg>
    );
  }

  // Fallback
  return (
    <div className="w-full h-full rounded-lg bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center">
      {brandName.slice(0, 2).toUpperCase()}
    </div>
  );
};
export default BrandLogo;
