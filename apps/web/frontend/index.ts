// Package entry point for @stratifio/web consumers
export { RootLayout } from './App'
export type { AnalyticsAdapter } from './lib/analytics'
export { AnalyticsProvider, useAnalytics } from './lib/analytics'

// Design system primitives
export { Button } from './components/ui/button'
export type { ButtonProps } from './components/ui/button'
export { Badge } from './components/ui/badge'
export {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
} from './components/ui/card'
export { Input } from './components/ui/input'
export type { InputProps } from './components/ui/input'
export { Label } from './components/ui/label'
export { Separator } from './components/ui/separator'
export { Skeleton } from './components/ui/skeleton'
export { Spinner } from './components/ui/spinner'
export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './components/ui/select'
export { ScrollArea } from './components/ui/scroll-area'
export { Popover, PopoverTrigger, PopoverContent } from './components/ui/popover'
export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './components/ui/tooltip'
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './components/ui/dialog'
export { Textarea } from './components/ui/textarea'
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './components/ui/collapsible'
export { cn } from './lib/utils'
