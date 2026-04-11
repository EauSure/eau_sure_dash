import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { Check } from 'lucide-react';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect(session.user.role === 'admin' ? '/admin' : '/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold">
            IoT Water Monitoring
          </CardTitle>
          <CardDescription>
            Autonomous water quality analysis platform
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Link href="/fr/auth/signin" className="block">
              <Button className="w-full" size="lg">
                Sign In
              </Button>
            </Link>

            <Link href="/auth/signup" className="block">
              <Button variant="outline" className="w-full" size="lg">
                Create Account
              </Button>
            </Link>
          </div>

          <div className="pt-6 border-t">
            <h3 className="text-sm font-semibold mb-3">Platform Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center">
                <Check className="h-4 w-4 text-primary mr-2" />
                Secure authentication system
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-primary mr-2" />
                Real-time sensor monitoring
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-primary mr-2" />
                LoRaWAN connectivity
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 text-primary mr-2" />
                ESP32-S3 integration
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
