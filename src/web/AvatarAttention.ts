import { createContext } from 'react';

/** Shared selected-tool center in viewport percentages; null clears the core focus arc. */
export const AvatarAttention = createContext<{ x: number; y: number } | null>(null);
