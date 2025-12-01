import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Your account information</p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* ---------------- USER INFO CARD ---------------- */}
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">
              User Information
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* User ID */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 flex items-center gap-3">
              <User className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="font-mono text-sm break-all">{user.id}</p>
              </div>
            </div>

            {/* Email */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 flex items-center gap-3">
              <Mail className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>

            {/* Role */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 flex items-center gap-3">
              <Shield className="h-6 w-6 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <div className="flex gap-2 mt-1">
                  {user.is_superuser ? (
                    <Badge className="px-3 py-1 text-sm">Administrator</Badge>
                  ) : (
                    <Badge variant="secondary" className="px-3 py-1 text-sm">
                      User
                    </Badge>
                  )}
                  {user.is_verified && (
                    <Badge variant="outline" className="px-3 py-1 text-sm">
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ---------------- ACCOUNT STATUS CARD ---------------- */}
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">
              Account Status
            </CardTitle>
            <CardDescription>Current account state</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Active Status */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <p className="text-s text-muted-foreground mb-1">
                Active Status
              </p>
              <Badge
                variant={user.is_active ? 'default' : 'destructive'}
                className="px-3 py-1 text-sm"
              >
                {user.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {/* Permissions */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
              <p className="text-s text-muted-foreground mb-2">
                Permissions
              </p>

              <ul className="space-y-1 text-sm">
                <li>✓ View telemetry data</li>
                <li>✓ Write setpoint values</li>
                <li>✓ Park instant cutoff</li>

                {user.is_superuser && (
                  <>
                    <li>✓ Manage users</li>
                    <li>✓ Manage parks</li>
                    <li>✓ Manage labels</li>
                  </>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
