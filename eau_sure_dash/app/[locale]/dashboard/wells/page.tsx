import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets } from 'lucide-react';

export default async function WellsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/fr/auth/signin');
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Wells & Reservoirs</CardTitle>
            <CardDescription>
              No monitoring sites configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Droplets className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Wells Configured</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Deploy buoy sensor nodes to your wells and reservoirs, then register them in the system to start monitoring water quality parameters.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
