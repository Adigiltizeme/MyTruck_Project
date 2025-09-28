import React from 'react';

interface UnreadBadgeProps {
  count: number;
  maxDisplay?: number;
  className?: string;
}

/**
 * Composant Badge pour afficher le nombre d'éléments non lus
 * Affiche un point rouge si count > 0, avec le nombre si <= maxDisplay
 */
export const UnreadBadge: React.FC<UnreadBadgeProps> = ({
  count,
  maxDisplay = 99,
  className = ''
}) => {
  if (count <= 0) return null;

  const displayText = count > maxDisplay ? `${maxDisplay}+` : count.toString();

  return (
    <span
      className={`
        absolute -top-1 -right-1
        bg-red-500 text-white text-xs font-bold
        rounded-full min-w-[18px] h-[18px]
        flex items-center justify-center
        border-2 border-white
        animate-pulse
        ${className}
      `}
      title={`${count} non lu${count > 1 ? 's' : ''}`}
    >
      {count <= 9 ? displayText : '9+'}
    </span>
  );
};