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

const GRADIENTS = [
  'from-blue-600 to-indigo-600',
  'from-emerald-600 to-teal-700',
  'from-violet-600 to-purple-700',
  'from-amber-500 to-orange-600',
  'from-rose-600 to-pink-700',
  'from-cyan-600 to-blue-700',
  'from-teal-600 to-emerald-700',
  'from-fuchsia-600 to-pink-600'
];

function getGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[idx];
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
  const gradient = getGradient(seed);
  const initials = getInitials(name, email);

  return (
    <div className={cn('relative inline-flex shrink-0 select-none items-center justify-center rounded-full shadow-2xs', sizeClasses, className)}>
      {isBot ? (
        <div className="h-full w-full rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
          <Bot className={size === 'xs' || size === 'sm' ? 'h-3.5 w-3.5' : size === 'xl' ? 'h-8 w-8' : 'h-5 w-5'} />
        </div>
      ) : isDev ? (
        <div className="h-full w-full rounded-full bg-linear-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-extrabold shadow-xs">
          <Code2 className={size === 'xs' || size === 'sm' ? 'h-3.5 w-3.5' : size === 'xl' ? 'h-8 w-8' : 'h-5 w-5'} />
        </div>
      ) : photoUrl && !imgError ? (
        <img
          src={photoUrl}
          alt={name || 'User'}
          className="h-full w-full rounded-full object-cover ring-1 ring-border"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={cn('h-full w-full rounded-full bg-linear-to-br flex items-center justify-center font-bold text-white tracking-wider', gradient)}>
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
