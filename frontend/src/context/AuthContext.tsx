'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';

import { api } from '@/lib/api/client';
import { getToken, saveToken, clearToken } from '@/lib/auth/token';

// User type based on backend response
export interface User {
    id: string;
    email: string;
    name?: string;
    role?: 'user' | 'admin' | 'tailor';
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user on first app mount
    useEffect(() => {
        const loadUser = async () => {
            const token = getToken();

            if (!token) {
                setUser(null);
                setIsLoading(false);
                return;
            }

            try {
                // IMPORTANT: assumes api client automatically attaches token
                const profile = await api.get<User>('/api/users/profile');

                // FIX: handle both axios and direct response cases safely
                const userData = (profile as any)?.data ?? profile;

                setUser(userData);
            } catch (error) {
                console.error('Failed to load user profile:', error);
                clearToken();
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    // LOGIN
    const login = async (email: string, password: string) => {
        setIsLoading(true);

        try {
            const response = await api.post<{
                token: string;
                user: User;
            }>('/api/users/signin', {
                email,
                password,
            });

            // handle axios vs direct response
            const data = (response as any)?.data ?? response;

            saveToken(data.token);
            setUser(data.user);
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    // LOGOUT
    const logout = () => {
        clearToken();
        setUser(null);
    };

    const value: AuthContextType = {
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user && !isLoading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}