import { QueryClient } from '@tanstack/react-query'
import type { z } from 'zod'
import { ZodError } from 'zod'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ZodError; issues: Array<{ path: string; message: string }> }

export function validateWithSchema<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))

  return {
    success: false,
    error: result.error,
    issues,
  }
}

export function parseApiResponse<T extends z.ZodSchema>(
  schema: T,
  data: unknown,
  context?: string
): z.infer<T> {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof ZodError) {
      const contextPrefix = context ? `[${context}] ` : ''
      const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      throw new Error(`${contextPrefix}Validation failed: ${issues}`)
    }
    throw error
  }
}

export function safeParseApiResponse<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): ValidationResult<z.infer<T>> {
  return validateWithSchema(schema, data)
}
