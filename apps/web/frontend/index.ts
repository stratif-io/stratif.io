// Package entry point for @stratifio/web consumers
import './index.css'
export { RootLayout } from './App'
export type { AnalyticsAdapter } from './lib/analytics'
export { AnalyticsProvider, useAnalytics } from './lib/analytics'

// Design-system primitives (shadcn/ui)
export { cn } from './lib/utils'

export { Button, buttonVariants, type ButtonProps } from './components/ui/button'
export { Badge, badgeVariants } from './components/ui/badge'
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/ui/card'
export { Input } from './components/ui/input'
export { Label } from './components/ui/label'
export { Separator } from './components/ui/separator'
export { Skeleton } from './components/ui/skeleton'
export { Spinner } from './components/ui/spinner'
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './components/ui/select'
export { ScrollArea, ScrollBar } from './components/ui/scroll-area'
export { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip'
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from './components/ui/dialog'
export { Segmented, type SegmentedOption } from './components/ui/segmented'
export { Textarea } from './components/ui/textarea'
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './components/ui/collapsible'
