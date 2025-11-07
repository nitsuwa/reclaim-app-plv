export const PLVLogo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizeClasses[size]} bg-primary rounded-full flex items-center justify-center shadow-md`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/4 h-3/4"
        >
          {/* Shield shape */}
          <path
            d="M50 10 L20 25 L20 50 Q20 75 50 90 Q80 75 80 50 L80 25 Z"
            fill="#4da6ff"
            stroke="#ffffff"
            strokeWidth="2"
          />
          {/* Book/Pages */}
          <rect x="35" y="35" width="30" height="35" fill="#ffffff" rx="2" />
          <line x1="50" y1="35" x2="50" y2="70" stroke="#003366" strokeWidth="2" />
          <line x1="35" y1="45" x2="50" y2="45" stroke="#003366" strokeWidth="1.5" />
          <line x1="50" y1="45" x2="65" y2="45" stroke="#003366" strokeWidth="1.5" />
          <line x1="35" y1="52" x2="50" y2="52" stroke="#003366" strokeWidth="1.5" />
          <line x1="50" y1="52" x2="65" y2="52" stroke="#003366" strokeWidth="1.5" />
        </svg>
      </div>
      {size !== 'sm' && (
        <div className="text-center">
          <h3 className="text-primary tracking-tight">ReClaim</h3>
          <p className="text-xs text-muted-foreground">PLV Lost and Found System</p>
        </div>
      )}
    </div>
  );
};