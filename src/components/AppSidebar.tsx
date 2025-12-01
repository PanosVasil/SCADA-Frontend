import { LayoutDashboard, Activity, User, Settings, Shield, Moon, Sun } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/components/ConnectionStatus';

const userItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Live Telemetry', url: '/telemetry', icon: Activity },
  { title: 'Profile', url: '/profile', icon: User },
];

// 🔥 Replaced the old two-item list with a single unified Admin page
const adminItems = [
  { title: 'Admin Management', url: '/admin', icon: Shield },
  { title: "Label Editor", url: "/admin/labels", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { isSuperuser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
      : 'hover:bg-sidebar-accent/50';

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-64'}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sidebar-foreground">SCADA</h2>
              <p className="text-xs text-sidebar-foreground/60">Monitoring System</p>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* USER SECTION */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ADMIN ONLY SECTION */}
        {isSuperuser && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex flex-col gap-2">
          {!collapsed && (
            <div className="mb-2">
              <ConnectionStatus />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="flex-1"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {!collapsed && <span className="ml-2">Theme</span>}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={logout}
              className="flex-1"
              title="Logout"
            >
              {!collapsed && 'Logout'}
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
