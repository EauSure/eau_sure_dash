import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LifeBuoy, Bug, MessageSquareWarning } from 'lucide-react';

export default async function SupportPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/fr/auth/signin');
  }

  const issues = [
    {
      id: 'BUG-112',
      title: 'Intermittent ESP32 telemetry delay',
      priority: 'High',
      status: 'Open',
      updatedAt: 'Today, 10:15',
    },
    {
      id: 'SUP-089',
      title: 'Need help configuring alert thresholds',
      priority: 'Medium',
      status: 'In Progress',
      updatedAt: 'Yesterday, 16:40',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Support technique et bugs</h1>
            <p className="text-muted-foreground">
              Suivez vos demandes de support et la visibilite des anomalies detectees.
            </p>
          </div>
          <Button>
            <MessageSquareWarning className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">2</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Critical Bugs</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">1</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">4h 20m</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-muted-foreground" />
              Active Support & Bug Visibility
            </CardTitle>
            <CardDescription>
              Current incidents and support requests linked to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="rounded-lg border border-border bg-card/40 p-4 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{issue.id}</p>
                  <p className="text-sm">{issue.title}</p>
                  <p className="text-xs text-muted-foreground">Updated: {issue.updatedAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={issue.priority === 'High' ? 'destructive' : 'secondary'}>{issue.priority}</Badge>
                  <Badge variant="outline">
                    <Bug className="h-3 w-3 mr-1" />
                    {issue.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
