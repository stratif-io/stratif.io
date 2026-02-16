import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpCircle, BookOpen, MessageCircle, Mail } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
        <p className="text-muted-foreground mt-1">
          Get help and learn how to use OpenFlow Analytics.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <CardTitle>Documentation</CardTitle>
            </div>
            <CardDescription>Learn how to use OpenFlow</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Comprehensive guides and API documentation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <CardTitle>Community</CardTitle>
            </div>
            <CardDescription>Join other users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect with other users and share insights.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Contact</CardTitle>
            </div>
            <CardDescription>Get in touch</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Contact our team for support.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
