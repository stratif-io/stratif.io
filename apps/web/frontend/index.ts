// Package entry point for @stratifio/web consumers
export { RootLayout } from './App'
export type { AnalyticsAdapter } from './lib/analytics'
export { AnalyticsProvider, useAnalytics } from './lib/analytics'

// UI primitives used by seeder-studio
export { Badge, badgeVariants } from './components/ui/badge'
export { Button, buttonVariants } from './components/ui/button'
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/ui/card'
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog'
export { Input } from './components/ui/input'
export { Label } from './components/ui/label'
export { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover'
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
export { Skeleton } from './components/ui/skeleton'
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip'
