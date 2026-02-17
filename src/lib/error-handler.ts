import { toast } from '@/components/ui/toast-provider';

/**
 * Error types for better error handling
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  statusCode?: number;
}

/**
 * Parse error response and determine error type
 */
export function parseError(error: unknown): AppError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: ErrorType.NETWORK,
      message: 'Network error. Please check your connection and try again.',
      originalError: error,
    };
  }

  // API errors
  if (error instanceof Response) {
    return {
      type: ErrorType.API,
      message: `Server error: ${error.statusText}`,
      statusCode: error.status,
      originalError: error,
    };
  }

  // Generic errors
  if (error instanceof Error) {
    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      originalError: error,
    };
  }

  // Unknown errors
  return {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred. Please try again.',
    originalError: error,
  };
}

/**
 * Handle errors with user-friendly toast notifications
 */
export function handleError(error: unknown, customMessage?: string): void {
  const appError = parseError(error);

  // Log to console for debugging
  console.error('Error:', {
    type: appError.type,
    message: appError.message,
    statusCode: appError.statusCode,
    originalError: appError.originalError,
    timestamp: new Date().toISOString(),
  });

  // Show user-friendly toast
  const displayMessage = customMessage || appError.message;

  switch (appError.type) {
    case ErrorType.NETWORK:
      toast.error(displayMessage, {
        description: 'Check your internet connection',
      });
      break;
    case ErrorType.API:
      if (appError.statusCode === 401) {
        toast.error('Authentication required', {
          description: 'Please log in to continue',
        });
      } else if (appError.statusCode === 403) {
        toast.error('Access denied', {
          description: 'You do not have permission to perform this action',
        });
      } else if (appError.statusCode === 404) {
        toast.error('Not found', {
          description: 'The requested resource could not be found',
        });
      } else if (appError.statusCode && appError.statusCode >= 500) {
        toast.error('Server error', {
          description: 'Something went wrong on our end. Please try again later.',
        });
      } else {
        toast.error(displayMessage);
      }
      break;
    default:
      toast.error(displayMessage);
  }
}

/**
 * Create a retry wrapper for async functions
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    onError?: (error: unknown, attempt: number) => void;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, onError } = options;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      onError?.(error, attempt);

      if (attempt === retries) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Retry failed');
}

/**
 * Success toast helper
 */
export function showSuccess(message: string, description?: string): void {
  toast.success(message, { description });
}

/**
 * Info toast helper
 */
export function showInfo(message: string, description?: string): void {
  toast.info(message, { description });
}

/**
 * Warning toast helper
 */
export function showWarning(message: string, description?: string): void {
  toast.warning(message, { description });
}
