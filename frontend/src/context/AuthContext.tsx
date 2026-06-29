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
    token?: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: string;
    isAdmin?: boolean;
    approvalStatus?: string;
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
    };
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<User>;
    register: (username: string, email: string, password: string, phone: string) => Promise<void>;
    registerTailor: (name: string, email: string, password: string) => Promise<User>;
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

    // SIGN IN
    const login = async (email: string, password: string): Promise<User> => {
        const response = await api.post<ApiUserResponse>('/api/users/signin', {
            email,
            password,
        });
        saveToken(response.token!);
        const mappedUser = mapApiUser(response);
        setUser(mappedUser);
        return mappedUser;
    };


    // SIGN UP
    const register = async (name: string, email: string, password: string, phone: string) => {
        const response = await api.post<ApiUserResponse>('/api/users/signup', {
            name,
            email,
            password,
            phone,
        });

        saveToken(response.token!);
        setUser(mapApiUser(response));
    };

    const registerTailor = async (name: string, email: string, password: string) => {
        const response = await api.post<ApiUserResponse>('/api/users/signup/tailor', {
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
        register,
        registerTailor,
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