// frontend/src/lib/auth/token.ts

const TOKEN_KEY = 'auth_token';

/**
 * Save JWT token to localStorage
 * @param token - The JWT token string from server
 */
export function saveToken(token: string): void {
    if (typeof window === 'undefined') return; // Guard for SSR
    localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Get JWT token from localStorage
 * @returns The token string or null if not found
 */
export function getToken(): string | null {
    if (typeof window === 'undefined') return null; // Guard for SSR
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Remove JWT token from localStorage (logout)
 */
export function clearToken(): void {
    if (typeof window === 'undefined') return; // Guard for SSR
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if user is authenticated (token exists)
 * @returns true if token exists
 */
export function isAuthenticated(): boolean {
    return getToken() !== null;
}