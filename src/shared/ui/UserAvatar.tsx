import React, { useState } from 'react';
import { Bot, Code2, User } from 'lucide-react';
import { cn } from '../utils/cn';

export interface UserAvatarProps {
  name?: string;
  email?: string;
  photoUrl?: string | null;
  role?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  isBot?: boolean;
  isDev?: boolean;
}

const PALETTES = [
  { bg: '#2563eb', color: '#ffffff', border: '#1d4ed8' }, // Blue
  { bg: '#059669', color: '#ffffff', border: '#047857' }, // Emerald
  { bg: '#7c3aed', color: '#ffffff', border: '#6d28d9' }, // Violet
  { bg: '#d97706', color: '#ffffff', border: '#b45309' }, // Amber
  { bg: '#e11d48', color: '#ffffff', border: '#be123c' }, // Rose
  { bg: '#0891b2', color: '#ffffff', border: '#0e7490' }, // Cyan
  { bg: '#4f46e5', color: '#ffffff', border: '#4338ca' }, // Indigo
  { bg: '#0d9488', color: '#ffffff', border: '#0f766e' }, // Teal
  { bg: '#c026d3', color: '#ffffff', border: '#a21caf' }, // Fuchsia
];

function getPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % PALETTES.length;
  return PALETTES[idx];
}

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const local = email.split('@')[0];
    return local.slice(0, 2).toUpperCase();
  }
  return 'U';
}

export function UserAvatar({
  name,
  email,
  photoUrl,
  role,
  size = 'md',
  className,
  showOnlineStatus = false,
  isOnline = false,
  isBot = false,
  isDev = false
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base font-bold',
    xl: 'h-16 w-16 text-xl font-extrabold'
  }[size];

  const dotSizeClasses = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4'
  }[size];

  const seed = name || email || role || 'User';
  const palette = getPalette(seed);
  const initials = getInitials(name, email);

  const hasValidPhoto = Boolean(photoUrl && photoUrl.trim() && !imgError);

  return (
    <div className={cn('relative inline-flex shrink-0 select-none items-center justify-center rounded-full shadow-xs', sizeClasses, className)}>
      {isBot ? (
        <div 
          className="h-full w-full rounded-full flex items-center justify-center text-white shadow-xs border border-indigo-400"
          style={{ backgroundColor: '#6366f1' }}
          title="Support Bot"
        >
          <Bot className={size === 'xs' || size === 'sm' ? 'h-3.5 w-3.5' : size === 'xl' ? 'h-8 w-8' : 'h-5 w-5'} />
        </div>
      ) : isDev ? (
        <div 
          className="h-full w-full rounded-full flex items-center justify-center text-white font-extrabold shadow-xs border border-blue-400"
          style={{ backgroundColor: '#2563eb' }}
          title="Developer Support"
        >
          <Code2 className={size === 'xs' || size === 'sm' ? 'h-3.5 w-3.5' : size === 'xl' ? 'h-8 w-8' : 'h-5 w-5'} />
        </div>
      ) : hasValidPhoto ? (
        <img
          src={photoUrl!}
          alt={name || 'User'}
          className="h-full w-full rounded-full object-cover border border-border"
          onError={() => setImgError(true)}
        />
      ) : (
        <div 
          className="h-full w-full rounded-full flex items-center justify-center font-black tracking-wider shadow-xs border"
          style={{ 
            backgroundColor: palette.bg, 
            color: palette.color,
            borderColor: palette.border 
          }}
          title={name || 'User Profile'}
        >
          {initials}
        </div>
      )}

      {showOnlineStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-background',
            dotSizeClasses,
            isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/60'
          )}
        />
      )}
    </div>
  );
}
