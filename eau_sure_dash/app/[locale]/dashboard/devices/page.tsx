import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Shield, Battery } from 'lucide-react';

export default async function DeviceManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/fr/auth/signin');
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* FUOTA Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Firmware Update (FUOTA)
            </CardTitle>
            <CardDescription>
              Over-the-air firmware deployment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No devices available for firmware updates. Deploy and register sensor nodes to enable FUOTA management.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Maintenance & Probe Health
            </CardTitle>
            <CardDescription>
              Anti-fouling and calibration status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No sensor probe data available. Maintenance scheduling and anti-fouling status will appear once devices are deployed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Power Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Battery className="h-5 w-5 mr-2" />
              Power & Battery Management
            </CardTitle>
            <CardDescription>
              Li-SOCl2 battery status and deep-sleep scheduling
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No device power data available. Battery life estimates and sleep schedules will be displayed once buoy nodes are active.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
