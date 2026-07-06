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
        if (process.env.NEXT_PUBLIC_API_URL) {
            this.baseUrl = process.env.NEXT_PUBLIC_API_URL;
        } else if (process.env.NODE_ENV === 'production') {
            // Same Vercel deployment — API is at /api on the same origin
            this.baseUrl = '';
        } else {
            this.baseUrl = 'http://localhost:5000';
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const defaultHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        const token = getToken();
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const config: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            let data: any;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                const errorMessage = this.sanitizeErrorMessage(data, response.status);
                const error: ApiError = {
                    status: response.status,
                    message: errorMessage,
                    data: data,
                };
                throw error;
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

    private sanitizeErrorMessage(data: unknown, status: number): string {
        if (typeof data === 'string') {
            const trimmed = data.trim();
            if (
                trimmed.startsWith('<') ||
                trimmed.includes('__next_error__') ||
                trimmed.includes('<!DOCTYPE') ||
                trimmed.length > 300
            ) {
                return this.getDefaultErrorMessage(status);
            }
            return trimmed;
        }

        if (data && typeof data === 'object') {
            const record = data as { message?: string; error?: string };
            if (typeof record.message === 'string' && record.message.trim()) {
                return record.message;
            }
            if (typeof record.error === 'string' && record.error.trim()) {
                return record.error;
            }
        }

        return this.getDefaultErrorMessage(status);
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
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {};
        const token = getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

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
                const errorMessage = this.sanitizeErrorMessage(data, response.status);
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
