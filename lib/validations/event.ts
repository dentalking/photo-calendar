import { z } from "zod"
import { EventStatus } from "@prisma/client"

// Date validation helpers
const dateString = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: "Invalid date format" }
)

const futureDate = z.string().refine(
  (val) => new Date(val) >= new Date(),
  { message: "Date cannot be in the past" }
)

// Event creation schema
export const createEventSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .trim(),
  
  description: z.string()
    .max(2000, "Description must be less than 2000 characters")
    .optional()
    .nullable(),
  
  startDate: dateString.transform((val) => new Date(val)),
  
  endDate: dateString
    .transform((val) => new Date(val))
    .optional()
    .nullable(),
  
  isAllDay: z.boolean().default(false),
  
  location: z.string()
    .max(500, "Location must be less than 500 characters")
    .optional()
    .nullable(),
  
  address: z.string()
    .max(1000, "Address must be less than 1000 characters")
    .optional()
    .nullable(),
  
  category: z.string()
    .max(100, "Category must be less than 100 characters")
    .optional()
    .nullable(),
  
  color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color")
    .optional()
    .nullable(),
  
  status: z.nativeEnum(EventStatus).default(EventStatus.CONFIRMED),
  
  isVisible: z.boolean().default(true),
  
  // AI extraction metadata (optional)
  confidenceScore: z.number()
    .min(0)
    .max(1)
    .optional(),
  
  extractionId: z.string().optional().nullable(),
}).refine(
  (data) => {
    // If endDate is provided, it must be after startDate
    if (data.endDate) {
      return data.endDate >= data.startDate
    }
    return true
  },
  {
    message: "End date must be after start date",
    path: ["endDate"]
  }
)

// Event update schema (all fields optional except those that need validation)
export const updateEventSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .trim()
    .optional(),
  
  description: z.string()
    .max(2000, "Description must be less than 2000 characters")
    .optional()
    .nullable(),
  
  startDate: dateString
    .transform((val) => new Date(val))
    .optional(),
  
  endDate: dateString
    .transform((val) => new Date(val))
    .optional()
    .nullable(),
  
  isAllDay: z.boolean().optional(),
  
  location: z.string()
    .max(500, "Location must be less than 500 characters")
    .optional()
    .nullable(),
  
  address: z.string()
    .max(1000, "Address must be less than 1000 characters")
    .optional()
    .nullable(),
  
  category: z.string()
    .max(100, "Category must be less than 100 characters")
    .optional()
    .nullable(),
  
  color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color")
    .optional()
    .nullable(),
  
  status: z.nativeEnum(EventStatus).optional(),
  
  isVisible: z.boolean().optional(),
  
  isUserVerified: z.boolean().optional(),
}).refine(
  (data) => {
    // If both startDate and endDate are provided, endDate must be after startDate
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate
    }
    return true
  },
  {
    message: "End date must be after start date",
    path: ["endDate"]
  }
)

// Event list query schema
export const eventListQuerySchema = z.object({
  // Pagination
  page: z.string()
    .transform((val) => parseInt(val))
    .refine((val) => val >= 1, "Page must be at least 1")
    .default("1"),
  
  limit: z.string()
    .transform((val) => parseInt(val))
    .refine((val) => val >= 1 && val <= 100, "Limit must be between 1 and 100")
    .default("20"),
  
  // Date filtering
  startDate: dateString
    .transform((val) => new Date(val))
    .optional(),
  
  endDate: dateString
    .transform((val) => new Date(val))
    .optional(),
  
  // Category filtering
  category: z.string()
    .max(100)
    .optional(),
  
  // Status filtering
  status: z.nativeEnum(EventStatus).optional(),
  
  // Search
  search: z.string()
    .max(500)
    .optional(),
  
  // Visibility
  includeHidden: z.string()
    .transform((val) => val === "true")
    .default("false"),
  
  // Sorting
  sortBy: z.enum(["startDate", "createdAt", "updatedAt", "title"])
    .default("startDate"),
  
  sortOrder: z.enum(["asc", "desc"])
    .default("asc"),
  
  // AI confidence filtering
  minConfidence: z.string()
    .transform((val) => parseFloat(val))
    .refine((val) => val >= 0 && val <= 1, "Confidence must be between 0 and 1")
    .optional(),
  
  // User verification status
  verifiedOnly: z.string()
    .transform((val) => val === "true")
    .default("false"),
}).refine(
  (data) => {
    // If both startDate and endDate are provided for filtering, endDate must be after startDate
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate
    }
    return true
  },
  {
    message: "End date filter must be after start date filter",
    path: ["endDate"]
  }
)

// Batch operations schema
export const batchOperationSchema = z.object({
  operation: z.enum(["delete", "update_status", "update_visibility", "update_category"]),
  eventIds: z.array(z.string().min(1))
    .min(1, "At least one event ID is required")
    .max(100, "Cannot process more than 100 events at once"),
  
  // For update operations
  data: z.object({
    status: z.nativeEnum(EventStatus).optional(),
    isVisible: z.boolean().optional(),
    category: z.string()
      .max(100, "Category must be less than 100 characters")
      .optional()
      .nullable(),
  }).optional(),
}).refine(
  (data) => {
    // For update operations, data must be provided
    if (data.operation.startsWith("update_") && !data.data) {
      return false
    }
    
    // Check that the appropriate field is provided for each operation
    if (data.operation === "update_status" && !data.data?.status) {
      return false
    }
    if (data.operation === "update_visibility" && data.data?.isVisible === undefined) {
      return false
    }
    if (data.operation === "update_category" && data.data?.category === undefined) {
      return false
    }
    
    return true
  },
  {
    message: "Invalid data for the specified operation",
    path: ["data"]
  }
)

// Event duplicate schema
export const duplicateEventSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .trim()
    .optional(), // If not provided, will append "(Copy)" to original title
  
  startDate: dateString
    .transform((val) => new Date(val)),
  
  endDate: dateString
    .transform((val) => new Date(val))
    .optional()
    .nullable(),
    
  // Option to duplicate as a recurring event
  recurrence: z.object({
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    interval: z.number().min(1).max(365).default(1),
    count: z.number().min(1).max(100).default(1),
    until: dateString
      .transform((val) => new Date(val))
      .optional(),
  }).optional(),
}).refine(
  (data) => {
    // If endDate is provided, it must be after startDate
    if (data.endDate) {
      return data.endDate >= data.startDate
    }
    return true
  },
  {
    message: "End date must be after start date",
    path: ["endDate"]
  }
)

// Photo extraction request schema
export const photoExtractionSchema = z.object({
  // File validation will be handled at the upload level
  extractEvents: z.boolean().default(true),
  autoConfirm: z.boolean().default(false), // Auto-confirm high confidence events
  minConfidence: z.number()
    .min(0)
    .max(1)
    .default(0.7), // Minimum confidence to create events
  
  // Default event settings
  defaultCategory: z.string()
    .max(100)
    .optional()
    .nullable(),
  
  defaultColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color")
    .optional()
    .nullable(),
})

// iCal export schema
export const exportSchema = z.object({
  // Date range for export
  startDate: dateString
    .transform((val) => new Date(val))
    .optional(),
  
  endDate: dateString
    .transform((val) => new Date(val))
    .optional(),
  
  // Filter options
  categories: z.array(z.string()).optional(),
  statuses: z.array(z.nativeEnum(EventStatus)).optional(),
  includeHidden: z.boolean().default(false),
  verifiedOnly: z.boolean().default(false),
  
  // Export format options
  format: z.enum(["ics", "json", "csv"]).default("ics"),
  timezone: z.string().default("Asia/Seoul"),
})

// iCal import schema
export const importSchema = z.object({
  // File will be handled at upload level
  overwriteExisting: z.boolean().default(false),
  defaultCategory: z.string()
    .max(100)
    .optional()
    .nullable(),
  
  defaultColor: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color")
    .optional()
    .nullable(),
    
  // Conflict resolution
  conflictResolution: z.enum(["skip", "update", "duplicate"]).default("skip"),
})

// Statistics query schema
export const statsQuerySchema = z.object({
  // Time period
  period: z.enum(["week", "month", "quarter", "year", "all"]).default("month"),
  
  // Custom date range
  startDate: dateString
    .transform((val) => new Date(val))
    .optional(),
  
  endDate: dateString
    .transform((val) => new Date(val))
    .optional(),
  
  // Breakdown options
  groupBy: z.enum(["day", "week", "month", "category", "status"]).default("month"),
  
  // Include specific metrics
  includeAI: z.boolean().default(true), // AI extraction statistics
  includeUsage: z.boolean().default(true), // Usage statistics
})

// Type exports for use in API routes
export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type EventListQuery = z.infer<typeof eventListQuerySchema>
export type BatchOperationInput = z.infer<typeof batchOperationSchema>
export type DuplicateEventInput = z.infer<typeof duplicateEventSchema>
export type PhotoExtractionInput = z.infer<typeof photoExtractionSchema>
export type ExportInput = z.infer<typeof exportSchema>
export type ImportInput = z.infer<typeof importSchema>
export type StatsQuery = z.infer<typeof statsQuerySchema>