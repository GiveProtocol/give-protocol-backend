import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Search, CheckCircle, XCircle, Edit, Trash, Eye, Building, AlertTriangle } from 'lucide-react';
import { Logger } from '@/utils/logger';

interface CharityDetails {
  id: string;
  profile_id: string;
  name: string;
  description: string;
  category: string;
  image_url: string | null;
  total_received: number;
  available_balance: number;
  profile?: {
    user_id: string;
    type: string;
    created_at: string;
  };
}

const AdminCharities: React.FC = () => {
  const [charities, setCharities] = useState<CharityDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCharity, setSelectedCharity] = useState<CharityDetails | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchCharities();
  }, []);

  const fetchCharities = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('charity_details')
        .select(`
          *,
          profile:profile_id (
            user_id,
            type,
            created_at
          )
        `)
        .order('name');

      if (fetchError) throw fetchError;

      setCharities(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch charities';
      setError(message);
      Logger.error('Admin charities fetch error', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredCharities = charities.filter(charity => 
    charity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    charity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    charity.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleView = useCallback((charity: CharityDetails) => {
    setSelectedCharity(charity);
    setIsViewModalOpen(true);
  }, []);

  const handleEdit = useCallback((charity: CharityDetails) => {
    setSelectedCharity(charity);
    setIsEditModalOpen(true);
  }, []);

  const handleDelete = useCallback((charity: CharityDetails) => {
    setSelectedCharity(charity);
    setIsDeleteModalOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!selectedCharity) return;

    try {
      setLoading(true);
      
      // Delete charity details
      const { error: deleteError } = await supabase
        .from('charity_details')
        .delete()
        .eq('id', selectedCharity.id);

      if (deleteError) throw deleteError;

      // Delete profile
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedCharity.profile_id);

      if (profileDeleteError) throw profileDeleteError;

      setIsDeleteModalOpen(false);
      setSelectedCharity(null);
      
      // Refresh the list
      await fetchCharities();
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete charity';
      setError(message);
      Logger.error('Admin charity delete error', { error: err });
    } finally {
      setLoading(false);
    }
  }, [selectedCharity, fetchCharities]);

  const closeViewModal = useCallback(() => {
    setIsViewModalOpen(false);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleCharityInputChange = useCallback((field: keyof CharityDetails, value: string) => {
    if (selectedCharity) {
      setSelectedCharity({...selectedCharity, [field]: value});
    }
  }, [selectedCharity]);

  const handleSaveEdit = useCallback(async (updatedCharity: Partial<CharityDetails>) => {
    if (!selectedCharity) return;

    try {
      setLoading(true);
      
      const { error: updateError } = await supabase
        .from('charity_details')
        .update({
          name: updatedCharity.name,
          description: updatedCharity.description,
          category: updatedCharity.category,
          image_url: updatedCharity.image_url
        })
        .eq('id', selectedCharity.id);

      if (updateError) throw updateError;

      setIsEditModalOpen(false);
      setSelectedCharity(null);
      
      // Refresh the list
      await fetchCharities();
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update charity';
      setError(message);
      Logger.error('Admin charity update error', { error: err });
    } finally {
      setLoading(false);
    }
  }, [selectedCharity, fetchCharities]);

  if (loading && charities.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Charities</h1>
        <Button>Add New Charity</Button>
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
              placeholder="Search charities..."
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
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Received
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available Balance
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCharities.map((charity) => (
                <tr key={charity.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {charity.image_url ? (
                          <img className="h-10 w-10 rounded-full object-cover" src={charity.image_url} alt={charity.name} />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Building className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{charity.name}</div>
                        <div className="text-sm text-gray-500">{charity.profile?.created_at ? new Date(charity.profile.created_at).toLocaleDateString() : 'Unknown'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{charity.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${charity.total_received.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${charity.available_balance.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(charity)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(charity)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(charity)}
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
      {isViewModalOpen && selectedCharity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Charity Details</h2>
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
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{selectedCharity.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="font-medium">{selectedCharity.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Description</p>
                      <p className="text-sm">{selectedCharity.description}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Financial Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Total Received</p>
                      <p className="font-medium">${selectedCharity.total_received.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Available Balance</p>
                      <p className="font-medium">${selectedCharity.available_balance.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Profile ID</p>
                    <p className="font-mono text-sm">{selectedCharity.profile_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User ID</p>
                    <p className="font-mono text-sm">{selectedCharity.profile?.user_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created At</p>
                    <p className="font-medium">{selectedCharity.profile?.created_at ? new Date(selectedCharity.profile.created_at).toLocaleString() : 'Unknown'}</p>
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
      {isEditModalOpen && selectedCharity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Edit Charity</h2>
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
              <form className="space-y-4">
                <Input
                  label="Name"
                  value={selectedCharity.name}
                  onChange={(e) => handleCharityInputChange('name', e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={selectedCharity.description}
                    onChange={(e) => handleCharityInputChange('description', e.target.value)}
                    rows={4}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <Input
                  label="Category"
                  value={selectedCharity.category}
                  onChange={(e) => handleCharityInputChange('category', e.target.value)}
                />
                <Input
                  label="Image URL"
                  value={selectedCharity.image_url || ''}
                  onChange={(e) => handleCharityInputChange('image_url', e.target.value)}
                />
              </form>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={closeEditModal}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSaveEdit(selectedCharity)}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedCharity && (
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
                Are you sure you want to delete <span className="font-semibold">{selectedCharity.name}</span>? This action cannot be undone.
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
                  {loading ? 'Deleting...' : 'Delete Charity'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCharities;