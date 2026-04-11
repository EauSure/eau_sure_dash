'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Bell, ShieldAlert } from 'lucide-react';

export default function AlertsPage() {
  const alerts = [
    {
      id: 'ALR-104',
      type: 'Water Quality',
      severity: 'Critical',
      device: 'DEV-ESP32-002',
      message: 'TDS threshold exceeded for 12 minutes',
      time: 'Today, 09:40',
    },
    {
      id: 'ALR-103',
      type: 'Battery',
      severity: 'Warning',
      device: 'DEV-ESP32-004',
      message: 'Battery dropped below 25%',
      time: 'Today, 07:15',
    },
    {
      id: 'ALR-099',
      type: 'Connectivity',
      severity: 'Info',
      device: 'DEV-ESP32-003',
      message: 'Connection restored after temporary outage',
      time: 'Yesterday, 23:08',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Alertes</h1>
          <p className="text-muted-foreground">
            Suivez les alertes critiques, avertissements et evenements d&apos;information.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Warnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              Alert Feed
            </CardTitle>
            <CardDescription>Dernieres alertes detectees sur vos dispositifs</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.id}</TableCell>
                    <TableCell>{alert.type}</TableCell>
                    <TableCell>{alert.device}</TableCell>
                    <TableCell>{alert.message}</TableCell>
                    <TableCell className="text-muted-foreground">{alert.time}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={alert.severity === 'Critical' ? 'destructive' : 'secondary'}
                      >
                        {alert.severity === 'Critical' ? <ShieldAlert className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                        {alert.severity}
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
