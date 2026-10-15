import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, UserCog, Activity, Users, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { FASTAPI_ENDPOINTS } from '../config/api';
import AdminDashboard from './AdminDashboard';

export default function SuperAdminDashboard() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch both HR and Employees
      const [hrRes, empRes] = await Promise.all([
        fetch(FASTAPI_ENDPOINTS.authUsersRole('hr')),
        fetch(FASTAPI_ENDPOINTS.authUsersRole('employee'))
      ]);
      const hrData = await hrRes.json();
      const empData = await empRes.json();

      let allUsers: any[] = [];
      if (hrData.success && hrData.users) allUsers = [...allUsers, ...hrData.users];
      if (empData.success && empData.users) allUsers = [...allUsers, ...empData.users];
      
      setUsers(allUsers);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to completely delete this user from the system?")) return;
    
    try {
      const res = await fetch(FASTAPI_ENDPOINTS.authDeleteUser(userId), {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        alert("User deleted successfully.");
        fetchUsers();
      } else {
        alert("Failed to delete user: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className={`min-h-screen p-8 pt-24 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-8"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Super Admin Control Center
            </h1>
            <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mt-2`}>
              Manage platform users and monitor overall system health
            </p>
          </div>
          <ShieldAlert className="w-12 h-12 text-cyan-500" />
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-8">
            <TabsTrigger value="users" className="flex gap-2">
              <Users className="w-4 h-4" /> User Management
            </TabsTrigger>
            <TabsTrigger value="system" className="flex gap-2">
              <Activity className="w-4 h-4" /> System Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card className={`${theme === 'dark' ? 'bg-slate-900/50 border-cyan-500/30' : 'bg-white border-cyan-200'}`}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Registered Platform Users</span>
                  <Button onClick={fetchUsers} variant="outline" size="sm">Refresh Data</Button>
                </CardTitle>
                <CardDescription>View, manage or delete registered HR and Employee accounts.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" /></div>
                ) : error ? (
                  <div className="flex items-center gap-2 text-red-500 p-4 bg-red-500/10 rounded-lg">
                    <AlertCircle /> {error}
                  </div>
                ) : (
                  <div className="rounded-md border border-slate-700/50 overflow-hidden">
                    <Table>
                      <TableHeader className={theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user._id} className={theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}>
                            <TableCell className="font-medium">{user.full_name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                user.role === 'hr' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                              }`}>
                                {user.role.toUpperCase()}
                              </span>
                            </TableCell>
                            <TableCell>{user.company || '-'}</TableCell>
                            <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user._id)}
                                className="h-8 px-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {users.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center p-8 text-slate-500">
                              No users found in the system.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="mb-4 text-sm text-cyan-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Showing nested real-time System Metrics Panel
            </div>
            {/* We reuse the existing AdminDashboard for system health visualization */}
            <div className="border border-cyan-500/30 rounded-xl overflow-hidden bg-slate-900/50 relative">
               <AdminDashboard />
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
