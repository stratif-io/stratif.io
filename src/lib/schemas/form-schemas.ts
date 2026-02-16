import { z } from 'zod'

export const DateRangeFormSchema = z
  .object({
    from: z.date({
      required_error: 'Start date is required',
      invalid_type_error: 'Invalid date format',
    }),
    to: z.date({
      required_error: 'End date is required',
      invalid_type_error: 'Invalid date format',
    }),
  })
  .refine((data) => data.from <= data.to, {
    message: 'Start date must be before or equal to end date',
    path: ['from'],
  })

export const FilterFormSchema = z.object({
  eventType: z.string().optional(),
  deviceType: z.enum(['desktop', 'mobile', 'tablet', 'all']).optional(),
  userId: z.string().optional(),
})

export const PaginationFormSchema = z.object({
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
})

export const EventFilterFormSchema = z.object({
  eventName: z.string().min(1, 'Event name is required'),
  dateRange: DateRangeFormSchema.optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
})

export const SessionFilterFormSchema = z.object({
  userId: z.string().optional(),
  minDuration: z.number().nonnegative().optional(),
  maxDuration: z.number().nonnegative().optional(),
  minEvents: z.number().int().nonnegative().optional(),
  maxEvents: z.number().int().nonnegative().optional(),
  dateRange: DateRangeFormSchema.optional(),
})

export const RetentionFilterFormSchema = z.object({
  cohortDays: z.number().int().min(7).max(90).default(30),
  dateRange: DateRangeFormSchema.optional(),
})

export const PathFilterFormSchema = z.object({
  targetEvent: z.string().min(1, 'Target event is required'),
  deviceType: z.enum(['desktop', 'mobile', 'tablet', 'all']).optional(),
  dateRange: DateRangeFormSchema.optional(),
})

export const ConversionFilterFormSchema = z.object({
  conversionEvent: z.string().min(1, 'Conversion event is required'),
  dateRange: DateRangeFormSchema.optional(),
})

export type DateRangeFormType = z.infer<typeof DateRangeFormSchema>
export type FilterFormType = z.infer<typeof FilterFormSchema>
export type PaginationFormType = z.infer<typeof PaginationFormSchema>
export type EventFilterFormType = z.infer<typeof EventFilterFormSchema>
export type SessionFilterFormType = z.infer<typeof SessionFilterFormSchema>
export type RetentionFilterFormType = z.infer<typeof RetentionFilterFormSchema>
export type PathFilterFormType = z.infer<typeof PathFilterFormSchema>
export type ConversionFilterFormType = z.infer<typeof ConversionFilterFormSchema>
