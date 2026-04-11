import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Wrench } from 'lucide-react';

export default async function UpdatesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/fr/auth/signin');
  }

  const firmwareRows = [
    {
      device: 'DEV-ESP32-001',
      current: 'v1.2.4',
      available: 'v1.3.0',
      status: 'Update Available',
      lastCheck: 'Today, 13:30',
    },
    {
      device: 'DEV-ESP32-002',
      current: 'v1.3.0',
      available: 'v1.3.0',
      status: 'Up to date',
      lastCheck: 'Today, 13:25',
    },
    {
      device: 'DEV-ESP32-003',
      current: 'v1.1.9',
      available: 'v1.3.0',
      status: 'Pending',
      lastCheck: 'Yesterday, 22:10',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Updates</h1>
            <p className="text-muted-foreground">
              Consultez l&apos;etat des mises a jour firmware de vos dispositifs.
            </p>
          </div>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Check Updates
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-muted-foreground" />
              Firmware Update Status
            </CardTitle>
            <CardDescription>
              User-facing update visibility separated from admin deployment operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Current</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Last Check</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {firmwareRows.map((row) => (
                  <TableRow key={row.device}>
                    <TableCell className="font-medium">{row.device}</TableCell>
                    <TableCell>{row.current}</TableCell>
                    <TableCell>{row.available}</TableCell>
                    <TableCell className="text-muted-foreground">{row.lastCheck}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.status === 'Update Available' ? 'destructive' : 'secondary'}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
