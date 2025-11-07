import { PLVLogo } from './PLVLogo';

export const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #f8f9fa, #ffffff, #f1f3f5)' }}>
      <div className="text-center">
        <div className="mb-8 animate-pulse">
          <PLVLogo className="w-24 h-24 mx-auto" />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: '#036CB5', animationDelay: '0ms' }} />
<div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: '#036CB5', animationDelay: '150ms' }} />
<div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: '#036CB5', animationDelay: '300ms' }} />
          </div>
          <p style={{ color: '#1a1a1a', fontWeight: '500' }}>Loading...</p>
        </div>
      </div>
    </div>
  );
};