import { Package } from 'lucide-react';

interface ItemPhotoDisplayProps {
  photoUrl: string;
  itemType: string;
  className?: string;
}

export const ItemPhotoDisplay = ({ photoUrl, itemType, className = '' }: ItemPhotoDisplayProps) => {
  const isPlaceholder = photoUrl === 'NO_PHOTO_PLACEHOLDER' || !photoUrl;

  if (isPlaceholder) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">No Photo</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt={itemType}
      className={className}
      onError={(e) => {
        // Fallback if image fails to load
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.className = `bg-muted flex items-center justify-center ${className}`;
        placeholder.innerHTML = `
          <div class="text-center">
            <svg class="h-12 w-12 mx-auto text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            <p class="text-xs text-muted-foreground">No Photo</p>
          </div>
        `;
        target.parentNode?.replaceChild(placeholder, target);
      }}
    />
  );
};