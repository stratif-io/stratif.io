import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface UnderConstructionProps {
  title?: string
  description?: string
  pageName?: string
  eta?: string
}

export function UnderConstruction({
  title = "Not available yet",
  description = "This feature isn't ready yet.",
  pageName = '',
  eta,
}: UnderConstructionProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-sm w-full space-y-6 text-center">
        {pageName && (
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
            {pageName}
          </p>
        )}
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        {eta && (
          <p className="text-xs text-muted-foreground/60">Expected {eta}</p>
        )}
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
          Go back
        </Button>
      </div>
    </div>
  )
}
