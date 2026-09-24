'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    ReactNode,
} from 'react';

import { api } from '@/lib/api/client';
import {
    AUTH_SESSION_EXPIRED_EVENT,
    AUTH_SESSION_KEY,
    broadcastSignedIn,
    broadcastSignedOut,
} from '@/lib/auth/sessionBroadcast';
import { clearLegacyAuthToken } from '@/lib/auth/token';
import { clearLocalCartStorage } from '@/lib/cartStorage';
import { clearLocalWishlistStorage } from '@/lib/wishlistStorage';
import { isSecureIframeFocused } from '@/lib/secureIframeFocus';

/** Backend signin/profile payload (see sendUserResponse in userRoutes.js) */
interface ApiUserResponse {
    _id: string;
    name: string;
    nameAr?: string;
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
    applicationSubmittedAt?: string | null;
    requestNumber?: string | null;
    rejectionNote?: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    nameAr?: string;
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
    applicationSubmittedAt?: string | null;
    requestNumber?: string | null;
    rejectionNote?: string;
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
        nameAr: data.nameAr || "",
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
        applicationSubmittedAt: data.applicationSubmittedAt || null,
        requestNumber: data.requestNumber || "",
        rejectionNote: data.rejectionNote || "",
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
    logout: (redirectTo?: string) => Promise<void>;
    applyUserResponse: (response: ApiUserResponse) => User;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function resolveLogoutLocation(redirectTo: string): string {
    if (typeof window === "undefined") return redirectTo;
    const segment = window.location.pathname.split("/")[1];
    const locale = segment === "ar" || segment === "en" ? segment : "en";
    const path = redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;
    if (path === `/${locale}` || path.startsWith(`/${locale}/`)) return path;
    return `/${locale}${path}`;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const loggedOutRef = useRef(false);
    const userRef = useRef<User | null>(null);
    userRef.current = user;

    useEffect(() => {
        const loadUser = async () => {
            clearLegacyAuthToken();

            try {
                const profile = await api.get<ApiUserResponse>('/api/users/profile');
                if (loggedOutRef.current) return;
                setUser(mapApiUser(profile));
            } catch (error) {
                const status = (error as any)?.status;
                const message = (error as any)?.message;
                if (status !== 401 && status !== 403 && message !== "Account is deactivated") {
                    console.error('Failed to load user profile:', message || error);
                }
                if (!loggedOutRef.current) {
                    setUser(null);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();

        const dropSession = () => {
            loggedOutRef.current = true;
            setUser(null);
            setIsLoading(false);
        };

        const syncSession = async (force = false) => {
            if (loggedOutRef.current && !force) return;
            try {
                const profile = await api.get<ApiUserResponse>("/api/users/profile");
                if (loggedOutRef.current && !force) return;
                loggedOutRef.current = false;
                setUser((prev) => {
                    const next = mapApiUser(profile);
                    if (
                        prev?.id === next.id &&
                        prev?.email === next.email &&
                        prev?.isGuest === next.isGuest &&
                        prev?.emailVerified === next.emailVerified &&
                        prev?.name === next.name
                    ) {
                        return prev;
                    }
                    return next;
                });
            } catch (error) {
                const status = (error as { status?: number })?.status;
                if (status === 401 || status === 403) {
                    dropSession();
                }
            } finally {
                setIsLoading(false);
            }
        };

        const onSessionExpired = () => dropSession();
        const onStorage = (event: StorageEvent) => {
            if (event.key !== AUTH_SESSION_KEY) return;
            if (!event.newValue) {
                dropSession();
                return;
            }
            loggedOutRef.current = false;
            void syncSession(true);
        };
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) void syncSession(true);
        };
        const onVisible = () => {
            if (document.visibilityState !== "visible") return;
            if (!userRef.current) return;
            if (isSecureIframeFocused()) return;
            void syncSession();
        };

        window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
        window.addEventListener("storage", onStorage);
        window.addEventListener("pageshow", onPageShow);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("pageshow", onPageShow);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, []);

    const persistSession = (response: ApiUserResponse) => {
        loggedOutRef.current = false;
        const mappedUser = mapApiUser(response);
        setUser(mappedUser);
        broadcastSignedIn(mappedUser.id);
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

    const logout = useCallback(async (redirectTo = "/auth/login") => {
        loggedOutRef.current = true;
        clearLegacyAuthToken();
        try {
            // Clear the httpOnly cookie before dropping local user state.
            // Account redirects as soon as `user` becomes null, and that
            // navigation can abort an in-flight logout request.
            await api.post("/api/users/logout");
        } catch {
            // Still leave the page; the local session is dropped below.
        }
        setUser(null);
        clearLocalCartStorage();
        clearLocalWishlistStorage();
        broadcastSignedOut();
        if (typeof window !== "undefined") {
            window.location.replace(resolveLogoutLocation(redirectTo));
        }
    }, []);

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
