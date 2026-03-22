import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Search,
  XCircle,
  Edit,
  Trash,
  Eye,
  Building,
  AlertTriangle,
} from "lucide-react";
import { Logger } from "@/utils/logger";

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

/** Page header with title and add charity button. */
const PageHeader: React.FC = () => (
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-bold text-gray-900">Manage Charities</h1>
    <Button>Add New Charity</Button>
  </div>
);

/** Search input card for filtering charities. */
const SearchCard: React.FC<{
  searchTerm: string;
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ searchTerm, onSearch }) => (
  <Card className="mb-6">
    <div className="p-4 relative">
      <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 text-gray-400" />
      <Input
        placeholder="Search charities..."
        value={searchTerm}
        onChange={onSearch}
        className="pl-10"
      />
    </div>
  </Card>
);

/** Avatar displaying a charity image or placeholder icon. */
const CharityAvatar: React.FC<{ imageUrl: string | null; name: string }> = ({
  imageUrl,
  name,
}) => {
  if (imageUrl) {
    return (
      <img
        className="flex-shrink-0 h-10 w-10 rounded-full object-cover"
        src={imageUrl}
        alt={name}
      />
    );
  }
  return (
    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
      <Building className="h-6 w-6 text-gray-500" />
    </div>
  );
};

/** Table row displaying a single charity with actions. */
const CharityRow: React.FC<{
  charity: CharityDetails;
  onView: (c: CharityDetails) => void;
  onEdit: (c: CharityDetails) => void;
  onDelete: (c: CharityDetails) => void;
}> = ({ charity, onView, onEdit, onDelete }) => (
  <tr>
    <td className="px-6 py-4 whitespace-nowrap flex items-center">
      <CharityAvatar imageUrl={charity.image_url} name={charity.name} />
      <div className="ml-4">
        <div className="text-sm font-medium text-gray-900">
          {charity.name}
        </div>
        <div className="text-sm text-gray-500">
          {charity.profile?.created_at
            ? new Date(charity.profile.created_at).toLocaleDateString()
            : "Unknown"}
        </div>
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm text-gray-900">{charity.category}</div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm text-gray-900">
        ${charity.total_received.toLocaleString()}
      </div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm text-gray-900">
        ${charity.available_balance.toLocaleString()}
      </div>
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
          onClick={() => onView(charity)}
          className="text-indigo-600 hover:text-indigo-900"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(charity)}
          className="text-blue-600 hover:text-blue-900"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(charity)}
          className="text-red-600 hover:text-red-900"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </td>
  </tr>
);

/** Column displaying charity name, category, and description. */
const BasicInfoColumn: React.FC<{ charity: CharityDetails }> = ({
  charity,
}) => (
  <div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Basic Information
    </h3>
    <div className="space-y-3">
      <div>
        <p className="text-sm text-gray-500">Name</p>
        <p className="font-medium">{charity.name}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Category</p>
        <p className="font-medium">{charity.category}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Description</p>
        <p className="text-sm">{charity.description}</p>
      </div>
    </div>
  </div>
);

/** Column displaying total received, available balance, and charity ID. */
const FinancialInfoColumn: React.FC<{ charity: CharityDetails }> = ({
  charity,
}) => (
  <div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Financial Information
    </h3>
    <div className="space-y-3">
      <div>
        <p className="text-sm text-gray-500">Total Received</p>
        <p className="font-medium">
          ${charity.total_received.toLocaleString()}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Available Balance</p>
        <p className="font-medium">
          ${charity.available_balance.toLocaleString()}
        </p>
      </div>
    </div>
  </div>
);

/** Section displaying associated profile details for a charity. */
const ProfileInfoSection: React.FC<{ charity: CharityDetails }> = ({
  charity,
}) => (
  <div className="mt-6">
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Profile Information
    </h3>
    <div className="space-y-3">
      <div>
        <p className="text-sm text-gray-500">Profile ID</p>
        <p className="font-mono text-sm">{charity.profile_id}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">User ID</p>
        <p className="font-mono text-sm">{charity.profile?.user_id}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Created At</p>
        <p className="font-medium">
          {charity.profile?.created_at
            ? new Date(charity.profile.created_at).toLocaleString()
            : "Unknown"}
        </p>
      </div>
    </div>
  </div>
);

/** Modal showing full charity details with info columns and profile section. */
const CharityViewModal: React.FC<{
  charity: CharityDetails;
  onClose: () => void;
}> = ({ charity, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Charity Details
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <XCircle className="h-5 w-5" />
        </Button>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BasicInfoColumn charity={charity} />
          <FinancialInfoColumn charity={charity} />
        </div>
        <ProfileInfoSection charity={charity} />
      </div>
      <div className="p-6 border-t border-gray-200 flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  </div>
);

const CharityEditModalBody: React.FC<{
  charity: CharityDetails;
  onInputChange: (field: keyof CharityDetails, value: string) => void;
}> = ({ charity, onInputChange }) => (
  <form className="space-y-4">
    <Input
      label="Name"
      value={charity.name}
      onChange={(e) => onInputChange("name", e.target.value)}
    />
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Description
      </label>
      <textarea
        value={charity.description}
        onChange={(e) => onInputChange("description", e.target.value)}
        rows={4}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      />
    </div>
    <Input
      label="Category"
      value={charity.category}
      onChange={(e) => onInputChange("category", e.target.value)}
    />
    <Input
      label="Image URL"
      value={charity.image_url || ""}
      onChange={(e) => onInputChange("image_url", e.target.value)}
    />
  </form>
);

const CharityEditModal: React.FC<{
  charity: CharityDetails;
  loading: boolean;
  onClose: () => void;
  onSave: (c: Partial<CharityDetails>) => void;
  onInputChange: (field: keyof CharityDetails, value: string) => void;
}> = ({ charity, loading, onClose, onSave, onInputChange }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Edit Charity</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <XCircle className="h-5 w-5" />
        </Button>
      </div>
      <div className="p-6">
        <CharityEditModalBody
          charity={charity}
          onInputChange={onInputChange}
        />
      </div>
      <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onSave(charity)} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  </div>
);

const DeleteConfirmContent: React.FC<{ charityName: string }> = ({
  charityName,
}) => (
  <>
    <AlertTriangle className="mx-auto mb-4 h-6 w-6 text-red-600 bg-red-100 rounded-full p-3 box-content" />
    <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
      Confirm Deletion
    </h3>
    <p className="text-sm text-gray-500 text-center mb-6">
      Are you sure you want to delete{" "}
      <span className="font-semibold">{charityName}</span>? This action cannot
      be undone.
    </p>
  </>
);

const CharitiesTableHead: React.FC = () => (
  <thead className="bg-gray-50">
    <tr>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Received</th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Balance</th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
    </tr>
  </thead>
);

const CharitiesTable: React.FC<{
  charities: CharityDetails[];
  onView: (c: CharityDetails) => void;
  onEdit: (c: CharityDetails) => void;
  onDelete: (c: CharityDetails) => void;
}> = ({ charities, onView, onEdit, onDelete }) => (
  <table className="min-w-full divide-y divide-gray-200">
    <CharitiesTableHead />
    <tbody className="bg-white divide-y divide-gray-200">
      {charities.map((charity) => (
        <CharityRow key={charity.id} charity={charity} onView={onView} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </tbody>
  </table>
);

const CharitiesTableCard: React.FC<{
  charities: CharityDetails[];
  onView: (c: CharityDetails) => void;
  onEdit: (c: CharityDetails) => void;
  onDelete: (c: CharityDetails) => void;
}> = ({ charities, onView, onEdit, onDelete }) => (
  <Card className="overflow-x-auto">
    <CharitiesTable charities={charities} onView={onView} onEdit={onEdit} onDelete={onDelete} />
  </Card>
);

const DeleteConfirmModal: React.FC<{
  charity: CharityDetails;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ charity, loading, onClose, onConfirm }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <DeleteConfirmContent charityName={charity.name} />
      <div className="flex justify-center space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? "Deleting..." : "Delete Charity"}
        </Button>
      </div>
    </div>
  </div>
);

/**
 * AdminCharities component retrieves and displays a list of charities for administrative actions such as view, edit, and delete.
 *
 * @returns JSX.Element - The admin charities component UI.
 */
const AdminCharities: React.FC = () => {
  const [charities, setCharities] = useState<CharityDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCharity, setSelectedCharity] = useState<CharityDetails | null>(
    null,
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  /**
   * Fetches the charities from the database using Supabase and updates state.
   *
   * @returns Promise<void> - Resolves when fetch is complete.
   */
  const fetchCharities = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("charity_details")
        .select(
          `
          *,
          profile:profile_id (
            user_id,
            type,
            created_at
          )
        `,
        )
        .order("name");

      if (fetchError) throw fetchError;

      setCharities(data || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch charities";
      setError(message);
      Logger.error("Admin charities fetch error", { error: err });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharities();
  }, []);

  /**
   * Updates the search term state based on user input.
   *
   * @param e - The input change event.
   * @returns void
   */
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredCharities = charities.filter(
    (charity) =>
      charity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charity.category.toLowerCase().includes(searchTerm.toLowerCase()),
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
        .from("charity_details")
        .delete()
        .eq("id", selectedCharity.id);

      if (deleteError) throw deleteError;

      // Delete profile
      const { error: profileDeleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", selectedCharity.profile_id);

      if (profileDeleteError) throw profileDeleteError;

      setIsDeleteModalOpen(false);
      setSelectedCharity(null);

      // Refresh the list
      await fetchCharities();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete charity";
      setError(message);
      Logger.error("Admin charity delete error", { error: err });
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

  const handleCharityInputChange = useCallback(
    (field: keyof CharityDetails, value: string) => {
      if (selectedCharity) {
        setSelectedCharity({ ...selectedCharity, [field]: value });
      }
    },
    [selectedCharity],
  );

  const handleSaveEdit = useCallback(
    async (updatedCharity: Partial<CharityDetails>) => {
      if (!selectedCharity) return;

      try {
        setLoading(true);

        const { error: updateError } = await supabase
          .from("charity_details")
          .update({
            name: updatedCharity.name,
            description: updatedCharity.description,
            category: updatedCharity.category,
            image_url: updatedCharity.image_url,
          })
          .eq("id", selectedCharity.id);

        if (updateError) throw updateError;

        setIsEditModalOpen(false);
        setSelectedCharity(null);

        // Refresh the list
        await fetchCharities();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update charity";
        setError(message);
        Logger.error("Admin charity update error", { error: err });
      } finally {
        setLoading(false);
      }
    },
    [selectedCharity, fetchCharities],
  );

  if (loading && charities.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <SearchCard searchTerm={searchTerm} onSearch={handleSearch} />

      <CharitiesTableCard
        charities={filteredCharities}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {isViewModalOpen && selectedCharity && (
        <CharityViewModal
          charity={selectedCharity}
          onClose={closeViewModal}
        />
      )}

      {isEditModalOpen && selectedCharity && (
        <CharityEditModal
          charity={selectedCharity}
          loading={loading}
          onClose={closeEditModal}
          onSave={handleSaveEdit}
          onInputChange={handleCharityInputChange}
        />
      )}

      {isDeleteModalOpen && selectedCharity && (
        <DeleteConfirmModal
          charity={selectedCharity}
          loading={loading}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default AdminCharities;
