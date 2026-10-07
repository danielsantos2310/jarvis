import { createContext } from 'react';

/** Selected tool center in viewport percentages; null means look at the owner. */
export const AvatarAttention = createContext<{ x: number; y: number } | null>(null);
