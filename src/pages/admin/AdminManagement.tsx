// src/pages/admin/AdminManagement.tsx
import { useEffect, useState } from "react";
import { apiService } from "@/services/api";
import type { AdminUser, Park } from "@/types/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Shield, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [parks, setParks] = useState<Park[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
const [selectedUserParks, setSelectedUserParks] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingParks, setLoadingParks] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // Load users & parks on mount
  useEffect(() => {
    void loadUsers();
    void loadParks();
  }, []);

  // When selected user changes, load their parks
  useEffect(() => {
    if (selectedUserId) {
      void loadUserParks(selectedUserId);
    } else {
      setSelectedUserParks([]);
    }
  }, [selectedUserId]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await apiService.getUsers({
        limit: 100,
        offset: 0,
        email: searchEmail || undefined,
      });
      setUsers(data);
      if (!selectedUserId && data.length > 0) {
        setSelectedUserId(data[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadParks = async () => {
    setLoadingParks(true);
    try {
      const data = await apiService.getParks();
      setParks(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load parks");
    } finally {
      setLoadingParks(false);
    }
  };

  const loadUserParks = async (userId: string) => {
    setLoadingAssignments(true);
    try {
      const data = await apiService.getUserParks(userId);
      setSelectedUserParks(data.map((p: Park) => p.id));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load user park access");
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleSearch = () => void loadUsers();

  const selectedUser = users.find((u) => u.id === selectedUserId) || null;

  const toggleAdmin = async (user: AdminUser) => {
    setUpdatingUser(user.id);
    try {
      const updated = await apiService.updateUser(user.id, {
        is_superuser: !user.is_superuser,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? updated : u))
      );
      toast.success(
        updated.is_superuser
          ? "User promoted to admin"
          : "User demoted to regular user"
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to update user role");
    } finally {
      setUpdatingUser(null);
    }
  };

  const toggleActive = async (user: AdminUser) => {
    setUpdatingUser(user.id);
    try {
      const updated = await apiService.updateUser(user.id, {
        is_active: !user.is_active,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? updated : u))
      );
      toast.success(
        updated.is_active ? "User activated" : "User deactivated"
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to update user status");
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Delete "${user.email}"? This cannot be undone.`))
      return;

    setDeletingUser(user.id);
    try {
      await apiService.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      if (selectedUserId === user.id) setSelectedUserId(null);
      toast.success("User deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete user");
    } finally {
      setDeletingUser(null);
    }
  };

  const handleToggleParkAccess = async (
    userId: string,
    parkId: string,
    checked: boolean
  ) => {
    try {
      if (checked) {
        await apiService.assignParkToUser(userId, parkId);
      } else {
        await apiService.revokeParkFromUser(userId, parkId);
      }

      await loadUserParks(userId);
      toast.success("Updated user park access");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update user park access");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Admin Management</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and access to parks in a single place.
          </p>
        </div>

        <Badge variant="outline" className="gap-1">
          <Shield className="h-4 w-4" />
          Admin Only
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
        {/* LEFT SIDE – USERS */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Select a user to manage settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch}>Search</Button>
            </div>

            {loadingUsers ? (
              <p className="py-6 text-center text-muted-foreground text-sm">
                Loading users…
              </p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={cn(
                      "w-full text-left rounded-lg border px-3 py-2.5 flex items-center justify-between",
                      selectedUserId === user.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    )}
                  >
                    <div>
                      <div className="font-medium">{user.email}</div>
                      <div className="flex gap-2 mt-1 text-xs">
                        <Badge
                          variant={user.is_active ? "default" : "secondary"}
                          className="text-[11px]"
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge
                          variant={
                            user.is_superuser ? "destructive" : "outline"
                          }
                          className="text-[11px]"
                        >
                          {user.is_superuser ? "Admin" : "User"}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT SIDE – USER DETAILS & PARK ACCESS */}
        <Card>
          <CardHeader>
            <CardTitle>User Access & Parks</CardTitle>
            <CardDescription>
              Manage user status and park permissions
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!selectedUser ? (
              <p className="py-8 text-center text-muted-foreground text-sm">
                Select a user to manage settings.
              </p>
            ) : (
              <>
                {/* USER SUMMARY HEADER */}
                <div className="border-b pb-4 flex justify-between items-start gap-4">
                  <div>
                    <h2 className="font-semibold">{selectedUser.email}</h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {selectedUser.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status:{" "}
                      <span className="font-medium">
                        {selectedUser.is_active ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={selectedUser.is_active ? "outline" : "default"}
                      onClick={() => toggleActive(selectedUser)}
                      disabled={updatingUser === selectedUser.id}
                    >
                      {selectedUser.is_active ? "Deactivate" : "Activate"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleAdmin(selectedUser)}
                      disabled={updatingUser === selectedUser.id}
                    >
                      {selectedUser.is_superuser
                        ? "Demote from admin"
                        : "Promote to admin"}
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteUser(selectedUser)}
                      disabled={deletingUser === selectedUser.id}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* PARK ACCESS TABLE */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-sm">Park Access</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedUserParks.length} / {parks.length} parks
                    </p>
                  </div>

                  {loadingParks ? (
                    <p className="py-6 text-center text-muted-foreground text-sm">
                      Loading parks…
                    </p>
                  ) : (
                    <div className="border rounded-lg max-h-[350px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/70 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Access</th>
                            <th className="px-3 py-2 text-left">Park</th>
                            <th className="px-3 py-2 text-left">URL</th>
                          </tr>
                        </thead>

                        <tbody>
                          {parks.map((park) => {
                            const hasAccess = selectedUserParks.includes(
                              String(park.id)
                            );

                            return (
                              <tr
                                key={park.id}
                                className="border-b border-border/20"
                              >
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={hasAccess}
                                    onChange={(e) =>
                                      handleToggleParkAccess(selectedUser.id, String(park.id), e.target.checked)
                                    }
                                  />
                                </td>

                                <td className="px-3 py-2 font-medium">
                                  {park.name}
                                </td>

                                <td className="px-3 py-2 text-muted-foreground">
                                  {park.url}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
