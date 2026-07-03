// frontend/src/lib/api/client.ts

import { getToken } from '@/lib/auth/token';

interface ApiError {
    status: number;
    message: string;
    data?: any;
}

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}


class ApiClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    }

    private resolveBaseUrl(): string {
        if (typeof window === 'undefined') {
            return this.baseUrl;
        }

        try {
            const configured = new URL(this.baseUrl);
            if (configured.origin === window.location.origin) {
                return '';
            }
        } catch {
            // fall through to configured base URL
        }

        return this.baseUrl;
    }

    private buildHeaders(extra?: Record<string, string>): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...extra,
        };

        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const base = this.resolveBaseUrl() || this.baseUrl;
        if (base.includes('ngrok')) {
            headers['ngrok-skip-browser-warning'] = 'true';
        }

        return headers;
    }

    private async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<T> {
        const url = `${this.resolveBaseUrl()}${endpoint}`;

        const config: RequestInit = {
            ...options,
            headers: {
                ...this.buildHeaders(),
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            // Try to parse response as JSON
            let data: any;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            // If response is not OK, throw an error with the message from the server
            if (!response.ok) {
                const errorMessage =
                    (typeof data === 'string' && data.trim()) ||
                    data?.message ||
                    data?.error ||
                    this.getDefaultErrorMessage(response.status);
                const error: ApiError = {
                    status: response.status,
                    message: errorMessage,
                    data: data,
                };
                throw error;
            }

            return data as T;
        } catch (error) {
            // Re-throw ApiErrors as-is
            if ((error as ApiError).status) {
                throw error;
            }

            // Handle network errors
            throw {
                status: 0,
                message: error instanceof Error ? error.message : 'Network error or server is unreachable',
            } as ApiError;
        }
    }

    private getDefaultErrorMessage(status: number): string {
        switch (status) {
            case 400: return 'Bad request. Please check your input.';
            case 401: return 'Unauthorized. Please log in.';
            case 403: return 'Forbidden. You don\'t have permission.';
            case 404: return 'Not found. The requested resource doesn\'t exist.';
            case 409: return 'Conflict. This resource already exists.';
            case 413: return 'Request too large. Use image URLs instead of file uploads.';
            case 422: return 'Validation failed. Please check your data.';
            case 429: return 'Too many requests. Please try again later.';
            case 500: return 'Internal server error. Please try again later.';
            default: return `Request failed with status ${status}`;
        }
    }

    async get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET', headers });
    }

    async post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async postFormData<T = any>(endpoint: string, formData: FormData): Promise<T> {
        const url = `${this.resolveBaseUrl()}${endpoint}`;
        const headers = this.buildHeaders();
        delete headers['Content-Type'];

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: formData,
            });

            let data: unknown;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                const errorMessage =
                    (typeof data === 'string' && data.trim()) ||
                    (data as { message?: string })?.message ||
                    (data as { error?: string })?.error ||
                    this.getDefaultErrorMessage(response.status);
                throw {
                    status: response.status,
                    message: errorMessage,
                    data,
                } as ApiError;
            }

            return data as T;
        } catch (error) {
            if ((error as ApiError).status) {
                throw error;
            }

            throw {
                status: 0,
                message: error instanceof Error ? error.message : 'Network error or server is unreachable',
            } as ApiError;
        }
    }

    async put<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async patch<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE', headers });
    }
}

export const api = new ApiClient();
export type { ApiError };

export function getApiErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === "object" && "message" in error) {
        const message = (error as ApiError).message;
        if (typeof message === "string" && message.trim()) return message;
    }
    if (error instanceof Error && error.message.trim()) return error.message;
    return fallback;
}