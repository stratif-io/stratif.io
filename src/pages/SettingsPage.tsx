import { useTheme } from '@/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your workspace preferences.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how the dashboard looks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Use dark theme</p>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="system-mode">System</Label>
                <p className="text-sm text-muted-foreground">Follow system preference</p>
              </div>
              <Switch
                id="system-mode"
                checked={theme === 'system'}
                onCheckedChange={(checked) => setTheme(checked ? 'system' : 'light')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
