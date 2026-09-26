/**
 * Normalizes a username by converting it to lowercase and removing any leading @.
 */
export const normalizeUsername = (username: string): string => {
  return username.replace(/^@/, '').toLowerCase().trim();
};

/**
 * Validates a normalized username.
 * Rules:
 * - 3 to 30 characters
 * - Only lowercase letters, numbers, underscores, and hyphens
 */
export const isValidUsername = (username: string): boolean => {
  const normalized = normalizeUsername(username);
  const regex = /^[a-z0-9_-]{3,30}$/;
  return regex.test(normalized);
};

/**
 * Formats a username for display by adding a leading @ if missing.
 */
export const formatUsername = (username: string): string => {
  if (!username) return '';
  const trimmed = username.trim();
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
};

/**
 * Generates alternative username suggestions if a username is taken.
 */
export const generateUsernameSuggestions = (baseName: string): string[] => {
  const normalized = normalizeUsername(baseName).replace(/[^a-z0-9_-]/g, '');
  const prefix = normalized.slice(0, 25); // leave room for suffixes
  
  return [
    formatUsername(`${prefix}1`),
    formatUsername(`${prefix}2`),
    formatUsername(`${prefix}01`),
    formatUsername(`${prefix}_m`),
    formatUsername(`${prefix}_usr`)
  ];
};

/**
 * Generates an internal auth email mapped from a normalized username.
 */
export const generateAuthEmail = (normalizedUsername: string): string => {
  return `${normalizedUsername}@estorepro.internal`;
};
