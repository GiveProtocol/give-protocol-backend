import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Search, AlertTriangle, Eye, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/utils/money";
import { formatDate } from "@/utils/date";
import { Logger } from "@/utils/logger";

interface Donation {
  id: string;
  donor_id: string;
  charity_id: string;
  amount: number;
  created_at: string;
  donor?: {
    id: string;
    user_id: string;
    type: string;
  };
  charity?: {
    id: string;
    user_id: string;
    type: string;
    charity_details?: {
      name: string;
    };
  };
}

const AdminDonations: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(
    null,
  );
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("donations")
        .select(
          `
          *,
          donor:donor_id (
            id,
            user_id,
            type
          ),
          charity:charity_id (
            id,
            user_id,
            type,
            charity_details:charity_details (
              name
            )
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setDonations(data || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch donations";
      setError(message);
      Logger.error("Admin donations fetch error", { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredDonations = donations.filter((donation) => {
    const charityName = donation.charity?.charity_details?.name || "";
    const donationId = donation.id || "";
    const donorId = donation.donor_id || "";
    const charityId = donation.charity_id || "";

    return (
      charityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charityId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleView = (donation: Donation) => {
    setSelectedDonation(donation);
    setIsViewModalOpen(true);
  };

  if (loading && donations.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Donation Records</h1>
        <Button onClick={fetchDonations} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
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
              placeholder="Search donations..."
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
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  ID
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Charity
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDonations.map((donation) => (
                <tr key={donation.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">
                      {donation.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(donation.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {donation.charity?.charity_details?.name ||
                        "Unknown Charity"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(donation.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(donation)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Modal */}
      {isViewModalOpen && selectedDonation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Donation Details
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsViewModalOpen(false)}
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Transaction Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Transaction ID</p>
                      <p className="font-mono text-sm">{selectedDonation.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">
                        {formatDate(selectedDonation.created_at, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className="font-medium">
                        {formatCurrency(selectedDonation.amount)}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Parties
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Donor ID</p>
                      <div className="flex items-center">
                        <p className="font-mono text-sm mr-2">
                          {selectedDonation.donor_id}
                        </p>
                        <a
                          href={`https://app.supabase.com/project/etqbojasfmpieigeefdj/editor/table/profiles/row/${selectedDonation.donor_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Charity</p>
                      <div className="flex items-center">
                        <p className="font-medium mr-2">
                          {selectedDonation.charity?.charity_details?.name ||
                            "Unknown Charity"}
                        </p>
                        <a
                          href={`https://app.supabase.com/project/etqbojasfmpieigeefdj/editor/table/charity_details/row/${selectedDonation.charity_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDonations;
