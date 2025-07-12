import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Search, AlertTriangle, Eye, Edit, Trash, XCircle, User, Shield } from 'lucide-react';
import { formatDate } from '@/utils/date';
import { Logger } from '@/utils/logger';

interface UserProfile {
  id: string;
  user_id: string;
  type: 'donor' | 'charity' | 'admin';
  created_at: string;
  user?: {
    email: string;
    last_sign_in_at: string;
  };
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editUserType, setEditUserType] = useState<'donor' | 'charity' | 'admin'>('donor');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Then, get user data from auth.users
      // Note: In a real implementation, you would need proper admin access to auth.users
      // This is a simplified version that assumes you have the necessary permissions
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

      if (usersError) {
        // If we can't access auth.users, just use the profiles data
        setUsers(profilesData || []);
      } else {
        // Merge profile data with user data
        const mergedUsers = profilesData?.map(profile => {
          const user = usersData.users.find(u => u.id === profile.user_id);
          return {
            ...profile,
            user: user ? {
              email: user.email,
              last_sign_in_at: user.last_sign_in_at
            } : undefined
          };
        });
        
        setUsers(mergedUsers || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(message);
      Logger.error('Admin users fetch error', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredUsers = users.filter(user => {
    const email = user.user?.email || '';
    const userId = user.user_id || '';
    const profileId = user.id || '';
    
    return (
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profileId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleView = useCallback((user: UserProfile) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((user: UserProfile) => {
    setSelectedUser(user);
    setEditUserType(user.type);
    setIsEditModalOpen(true);
  }, []);

  const handleDelete = useCallback((user: UserProfile) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      
      // Delete profile
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (profileDeleteError) throw profileDeleteError;

      // In a real implementation, you would also delete the user from auth.users
      // This requires admin access to the auth API

      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      
      // Refresh the list
      await fetchUsers();
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      setError(message);
      Logger.error('Admin user delete error', { error: err });
    } finally {
      setLoading(false);
    }
  }, [selectedUser, fetchUsers]);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          type: editUserType
        })
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      setIsEditModalOpen(false);
      setSelectedUser(null);
      
      // Refresh the list
      await fetchUsers();
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      setError(message);
      Logger.error('Admin user update error', { error: err });
    } finally {
      setLoading(false);
    }
  }, [selectedUser, editUserType, fetchUsers]);

  const closeViewModal = useCallback(() => {
    setIsViewModalOpen(false);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleUserTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditUserType(e.target.value as 'donor' | 'charity' | 'admin');
  }, []);

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <Button onClick={fetchUsers} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-500" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.user?.email || 'Unknown Email'}</div>
                        <div className="text-sm text-gray-500 font-mono">{user.user_id.substring(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.type === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : user.type === 'charity'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.type.charAt(0).toUpperCase() + user.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(user.created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.user?.last_sign_in_at 
                        ? formatDate(user.user.last_sign_in_at) 
                        : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Modal */}
      {isViewModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeViewModal}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedUser.user?.email || 'Unknown Email'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="font-medium">{selectedUser.type.charAt(0).toUpperCase() + selectedUser.type.slice(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created At</p>
                      <p className="font-medium">{formatDate(selectedUser.created_at, true)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Last Login</p>
                      <p className="font-medium">
                        {selectedUser.user?.last_sign_in_at 
                          ? formatDate(selectedUser.user.last_sign_in_at, true) 
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Technical Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Profile ID</p>
                      <p className="font-mono text-sm">{selectedUser.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">User ID</p>
                      <p className="font-mono text-sm">{selectedUser.user_id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button
                onClick={closeViewModal}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Edit User Type</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeEditModal}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{selectedUser.user?.email || 'Unknown Email'}</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Type
                </label>
                <select
                  value={editUserType}
                  onChange={handleUserTypeChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="donor">Donor</option>
                  <option value="charity">Charity</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              {editUserType === 'admin' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Caution</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          You are about to grant admin privileges to this user. Admins have full access to the platform, including sensitive data and operations.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={closeEditModal}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-red-100 rounded-full p-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Confirm Deletion</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to delete user <span className="font-semibold">{selectedUser.user?.email || selectedUser.user_id}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={closeDeleteModal}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmDelete}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete User'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;