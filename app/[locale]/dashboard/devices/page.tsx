import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Cpu, Thermometer, Battery, ActivitySquare } from 'lucide-react';

export default async function DeviceManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/fr/auth/signin');
  }

  const devices = [
    {
      id: 'DEV-ESP32-001',
      status: 'Online',
      temperature: '22.4 C',
      battery: 87,
      esp32: 'Healthy',
      performance: 'Stable',
    },
    {
      id: 'DEV-ESP32-002',
      status: 'Warning',
      temperature: '29.1 C',
      battery: 41,
      esp32: 'High Load',
      performance: 'Degraded',
    },
    {
      id: 'DEV-ESP32-003',
      status: 'Offline',
      temperature: '--',
      battery: 0,
      esp32: 'No Signal',
      performance: 'Unavailable',
    },
  ];

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dispositifs</h1>
            <p className="text-muted-foreground">
              Connectez vos appareils, suivez leur etat et controlez leurs performances.
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Connect Device
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Connected</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">2 / 3</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Temperature Avg</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">25.7 C</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Battery Avg</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">64%</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ESP32 Health</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">Good</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Cpu className="h-5 w-5 mr-2" />
              Device Monitoring
            </CardTitle>
            <CardDescription>
              Temperature, battery, ESP32 status and overall performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Temperature</TableHead>
                  <TableHead>ESP32</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead className="w-[180px]">Battery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.id}</TableCell>
                    <TableCell>
                      <Badge
                        variant={device.status === 'Warning' ? 'destructive' : 'secondary'}
                      >
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-muted-foreground" />
                        {device.temperature}
                      </span>
                    </TableCell>
                    <TableCell>{device.esp32}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <ActivitySquare className="h-4 w-4 text-muted-foreground" />
                        {device.performance}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Battery className="h-3.5 w-3.5" /> Battery
                          </span>
                          <span>{device.battery}%</span>
                        </div>
                        <Progress value={device.battery} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  );
}
