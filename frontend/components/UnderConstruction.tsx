import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Construction, ArrowLeft, Clock, Hammer, type LucideIcon } from 'lucide-react'

interface UnderConstructionProps {
  title?: string
  description?: string
  pageName?: string
  eta?: string
}

export function UnderConstruction({
  title = 'Under Construction',
  description = "This feature is coming soon. We're working hard to bring it to you!",
  pageName = '',
  eta = 'Q2 2024',
}: UnderConstructionProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Construction className="w-10 h-10 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          {pageName && (
            <CardDescription className="text-lg font-medium text-primary">
              {pageName}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">{description}</p>

          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>ETA: {eta}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Hammer className="w-4 h-4" />
              <span>In Development</span>
            </div>
          </div>

          <div className="bg-muted rounded-lg p-4 text-left">
            <h4 className="font-semibold mb-2">What to expect:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Advanced filtering and segmentation capabilities</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Real-time data processing and visualization</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Export and sharing functionality</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Custom alerts and notifications</span>
              </li>
            </ul>
          </div>

          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
