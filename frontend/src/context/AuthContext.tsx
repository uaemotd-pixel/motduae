'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';

import { api } from '@/lib/api/client';
import { clearLegacyAuthToken } from '@/lib/auth/token';

/** Backend signin/profile payload (see sendUserResponse in userRoutes.js) */
interface ApiUserResponse {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    isAdmin?: boolean;
    approvalStatus?: string;
    isActive?: boolean;
    authProvider?: string;
    hasPassword?: boolean;
    emailVerified?: boolean;
    perms?: Record<string, boolean>;
    isGuest?: boolean;
    guestContactEmail?: string | null;
    guestPendingEmail?: string | null;
}

export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: string;
    isAdmin?: boolean;
    approvalStatus?: string;
    isActive?: boolean;
    authProvider?: string;
    hasPassword?: boolean;
    /** false = must verify; missing/true = treated as verified */
    emailVerified?: boolean;
    perms?: Record<string, boolean>;
    isGuest?: boolean;
    guestContactEmail?: string | null;
    guestPendingEmail?: string | null;
}

export type GoogleAuthRole = "customer" | "tailor" | "fabric_store";
export type GoogleAuthMode = "login" | "register";

export interface GoogleAuthOptions {
    mode?: GoogleAuthMode;
    role?: GoogleAuthRole;
}

export function needsEmailVerification(user: User | null | undefined): boolean {
    return user?.emailVerified === false;
}

function mapApiUser(data: ApiUserResponse): User {
    return {
        id: data._id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        role: data.role,
        isAdmin: data.isAdmin,
        approvalStatus: data.approvalStatus,
        isActive: data.isActive,
        authProvider: data.authProvider,
        hasPassword: data.hasPassword,
        emailVerified: data.emailVerified !== false,
        perms: data.perms || {},
        isGuest: data.isGuest,
        guestContactEmail: data.guestContactEmail || null,
        guestPendingEmail: data.guestPendingEmail || null,
    };
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string, isGuest?: boolean) => Promise<User>;
    loginAsGuest: () => Promise<User>;
    loginWithGoogle: (credential: string, options?: GoogleAuthOptions) => Promise<User>;
    register: (username: string, email: string, password: string, phone: string) => Promise<User>;
    registerTailor: (name: string, email: string, password: string) => Promise<User>;
    registerFabricStore: (name: string, email: string, password: string) => Promise<User>;
    forgotPassword: (email: string) => Promise<string>;
    logout: () => Promise<void>;
    applyUserResponse: (response: ApiUserResponse) => User;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            clearLegacyAuthToken();

            try {
                const profile = await api.get<ApiUserResponse>('/api/users/profile');
                setUser(mapApiUser(profile));
            } catch (error) {
                if ((error as any)?.status !== 401) {
                    console.error('Failed to load user profile:', (error as any)?.message || error);
                }
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    const persistSession = (response: ApiUserResponse) => {
        const mappedUser = mapApiUser(response);
        setUser(mappedUser);
        return mappedUser;
    };

    const login = async (email: string, password: string, isGuest: boolean = false): Promise<User> => {
        const response = await api.post<ApiUserResponse>('/api/users/signin', {
            email,
            password,
            isGuest,
        });
        return persistSession(response);
    };

    const loginAsGuest = async (): Promise<User> => {
        const response = await api.post<ApiUserResponse>('/api/users/signin/guest');
        return persistSession(response);
    };

    const loginWithGoogle = async (
        credential: string,
        options?: GoogleAuthOptions,
    ): Promise<User> => {
        const response = await api.post<ApiUserResponse>('/api/users/auth/google', {
            credential,
            mode: options?.mode ?? 'login',
            ...(options?.role ? { role: options.role } : {}),
        });
        return persistSession(response);
    };

    const register = async (name: string, email: string, password: string, phone: string) => {
        const response = await api.post<ApiUserResponse>('/api/users/signup', {
            name,
            email,
            password,
            phone,
        });

        return persistSession(response);
    };

    const registerTailor = async (name: string, email: string, password: string) => {
        const response = await api.post<ApiUserResponse>('/api/users/signup/tailor', {
            name,
            email,
            password,
        });

        return persistSession(response);
    };

    const forgotPassword = async (email: string) => {
        const response = await api.post<{ message: string }>('/api/users/forgot-password', {
            email,
        });
        return response.message;
    };

    const registerFabricStore = async (name: string, email: string, password: string) => {
        const response = await api.post<ApiUserResponse>('/api/users/signup/fabricStore', {
            name,
            email,
            password,
        });

        return persistSession(response);
    };

    const logout = async () => {
        try {
            await api.post('/api/users/logout');
        } catch {
            // Clear local session even if the API call fails
        }
        setUser(null);
    };

    const value: AuthContextType = {
        user,
        isLoading,
        login,
        loginAsGuest,
        loginWithGoogle,
        register,
        registerTailor,
        registerFabricStore,
        forgotPassword,
        logout,
        applyUserResponse: persistSession,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}
