// apps/web/frontend/features/design-system/components/sections/PrimitivesSection.tsx
import { useState } from 'react'
import { ComponentSection, ComponentRow } from '../ComponentSection'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export function PrimitivesSection() {
  const [sliderValue, setSliderValue] = useState([40])

  return (
    <ComponentSection id="primitives" title="UI Primitives">
      <ComponentRow label="Button">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
      </ComponentRow>

      <ComponentRow label="Badge">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </ComponentRow>

      <ComponentRow label="Input">
        <Input placeholder="Placeholder text" className="w-48" />
        <Input value="With value" readOnly className="w-48" />
        <Input disabled placeholder="Disabled" className="w-48" />
      </ComponentRow>

      <ComponentRow label="Select">
        <Select>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Option A</SelectItem>
            <SelectItem value="b">Option B</SelectItem>
            <SelectItem value="c">Option C</SelectItem>
          </SelectContent>
        </Select>
      </ComponentRow>

      <ComponentRow label="Checkbox">
        <div className="flex items-center gap-2">
          <Checkbox id="cb-unchecked" />
          <Label htmlFor="cb-unchecked">Unchecked</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="cb-checked" defaultChecked />
          <Label htmlFor="cb-checked">Checked</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="cb-disabled" disabled />
          <Label htmlFor="cb-disabled">Disabled</Label>
        </div>
      </ComponentRow>

      <ComponentRow label="Switch">
        <div className="flex items-center gap-2">
          <Switch id="sw-off" />
          <Label htmlFor="sw-off">Off</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="sw-on" defaultChecked />
          <Label htmlFor="sw-on">On</Label>
        </div>
      </ComponentRow>

      <ComponentRow label="Slider">
        <Slider
          value={sliderValue}
          onValueChange={setSliderValue}
          min={0}
          max={100}
          step={1}
          className="w-48"
        />
        <span className="text-sm text-muted-foreground">{sliderValue[0]}%</span>
      </ComponentRow>

      <ComponentRow label="Progress">
        <Progress value={30} className="w-48" />
        <Progress value={65} className="w-48" />
        <Progress value={100} className="w-48" />
      </ComponentRow>

      <ComponentRow label="Skeleton">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </ComponentRow>

      <ComponentRow label="Spinner">
        <Spinner />
      </ComponentRow>

      <ComponentRow label="Avatar">
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>CD</AvatarFallback>
        </Avatar>
      </ComponentRow>

      <ComponentRow label="Separator">
        <div className="w-48">
          <p className="text-sm">Above</p>
          <Separator className="my-2" />
          <p className="text-sm">Below</p>
        </div>
      </ComponentRow>

      <ComponentRow label="Tooltip">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">
              Hover me
            </Button>
          </TooltipTrigger>
          <TooltipContent>Tooltip content</TooltipContent>
        </Tooltip>
      </ComponentRow>

      <ComponentRow label="Popover">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              Open popover
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <p className="text-sm">Popover content here.</p>
          </PopoverContent>
        </Popover>
      </ComponentRow>

      <ComponentRow label="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Open dialog
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog title</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Dialog body content.</p>
          </DialogContent>
        </Dialog>
      </ComponentRow>

      <ComponentRow label="DropdownMenu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Open menu
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Action one</DropdownMenuItem>
            <DropdownMenuItem>Action two</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ComponentRow>

      <ComponentRow label="Card — elevation">
        <div className="flex items-start gap-3 flex-wrap">
          {(['none', 'subtle', 'medium', 'prominent'] as const).map((e) => (
            <Card key={e} elevation={e} className="w-36">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                  {e}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">shadow variant</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </ComponentRow>

      <ComponentRow label="Card — hover">
        <div className="flex items-start gap-3 flex-wrap">
          {(['none', 'lift', 'glow'] as const).map((h) => (
            <Card key={h} hover={h} className="w-36">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                  {h}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">hover over me</p>
              </CardContent>
            </Card>
          ))}
          <Card clickable className="w-36">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">
                clickable
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">cursor + lift</p>
            </CardContent>
          </Card>
        </div>
      </ComponentRow>

      <ComponentRow label="Card — compact (metric)">
        <div className="flex items-start gap-3">
          <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm p-3 w-36">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Metric label
            </p>
            <p className="text-lg font-bold tracking-tight">48.2K</p>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded text-success bg-success/10 mt-1">
              ↑ 3.2%
            </span>
          </div>
          <p className="text-xs text-muted-foreground max-w-[160px] pt-1">
            Used for mission control metric cards. Same border-radius and bg as{' '}
            <code className="font-mono">Card</code>, but compact padding and button semantics.
          </p>
        </div>
      </ComponentRow>

      <ComponentRow label="ScrollArea">
        <ScrollArea className="h-24 w-48 border rounded-md p-2">
          {Array.from({ length: 10 }, (_, i) => (
            <p key={i} className="text-sm py-1">
              Item {i + 1}
            </p>
          ))}
        </ScrollArea>
      </ComponentRow>
    </ComponentSection>
  )
}
