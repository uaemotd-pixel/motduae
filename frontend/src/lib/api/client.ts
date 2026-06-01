// frontend/src/lib/api/client.ts

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

    private async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const defaultHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        const config: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
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
                const errorMessage = data?.message || data?.error || this.getDefaultErrorMessage(response.status);
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
            case 400:
                return 'Bad request. Please check your input.';
            case 401:
                return 'Unauthorized. Please log in.';
            case 403:
                return 'Forbidden. You don\'t have permission.';
            case 404:
                return 'Not found. The requested resource doesn\'t exist.';
            case 409:
                return 'Conflict. This resource already exists.';
            case 422:
                return 'Validation failed. Please check your data.';
            case 429:
                return 'Too many requests. Please try again later.';
            case 500:
                return 'Internal server error. Please try again later.';
            default:
                return `Request failed with status ${status}`;
        }
    }

    // GET request
    async get<T = any>(endpoint: string, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET', headers });
    }

    // POST request with JSON body
    async post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    // PUT request with JSON body
    async put<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    // PATCH request with JSON body
    async patch<T = any>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    // DELETE request
    async delete<T = any>(endpoint: string, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE', headers });
    }
}

// Export a singleton instance
export const api = new ApiClient();

// Export type for error handling
export type { ApiError };