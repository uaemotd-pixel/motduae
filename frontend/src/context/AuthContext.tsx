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
    token?: string;
    perms?: Record<string, boolean>;
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
    perms?: Record<string, boolean>;
}

export type GoogleAuthRole = "customer" | "tailor" | "fabric_store";
export type GoogleAuthMode = "login" | "register";

export interface GoogleAuthOptions {
    mode?: GoogleAuthMode;
    role?: GoogleAuthRole;
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
        perms: data.perms || {},
    };
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<User>;
    loginWithGoogle: (credential: string, options?: GoogleAuthOptions) => Promise<User>;
    register: (username: string, email: string, password: string, phone: string) => Promise<void>;
    registerTailor: (name: string, email: string, password: string) => Promise<User>;
    registerFabricStore: (name: string, email: string, password: string) => Promise<User>;
    forgotPassword: (email: string) => Promise<string>;
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

    useEffect(() => {
        const loadUser = async () => {
            const token = getToken();

            if (!token) {
                setUser(null);
                setIsLoading(false);
                return;
            }

            try {
                const profile = await api.get<ApiUserResponse>('/api/users/profile');
                setUser(mapApiUser(profile));
            } catch (error) {
                if ((error as any)?.status !== 401) {
                    console.error('Failed to load user profile:', (error as any)?.message || error);
                }
                clearToken();
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    const persistSession = (response: ApiUserResponse) => {
        saveToken(response.token!);
        const mappedUser = mapApiUser(response);
        setUser(mappedUser);
        return mappedUser;
    };

    const login = async (email: string, password: string): Promise<User> => {
        const response = await api.post<ApiUserResponse>('/api/users/signin', {
            email,
            password,
        });
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

        persistSession(response);
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

        saveToken(response.token!);
        const mappedUser = mapApiUser(response);
        setUser(mappedUser);
        return mappedUser;
    };

    const logout = () => {
        clearToken();
        setUser(null);
    };

    const value: AuthContextType = {
        user,
        isLoading,
        login,
        loginWithGoogle,
        register,
        registerTailor,
        registerFabricStore,
        forgotPassword,
        logout,
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
