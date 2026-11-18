export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: HeadersInit = isFormData
    ? options.headers || {}
    : {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const msg = typeof data === 'object' && data && 'error' in data ? String(data.error) : 'Request failed';
    throw new ApiError(msg, response.status);
  }

  if (!isJson) {
    throw new ApiError('Unexpected server response format. Please verify the backend API server is running.', response.status || 502);
  }

  return data as T;
}
