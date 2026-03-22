import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Search, Eye, ExternalLink, XCircle } from "lucide-react";
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

/* ── Sub-components ─────────────────────────────────────────────── */

const PageHeader: React.FC<{ loading: boolean; onRefresh: () => void }> = ({
  loading,
  onRefresh,
}) => (
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-bold text-gray-900">Donation Records</h1>
    <Button onClick={onRefresh} disabled={loading}>
      {loading ? "Refreshing..." : "Refresh"}
    </Button>
  </div>
);

/** Search input card for filtering donations. */
const SearchCard: React.FC<{
  searchTerm: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ searchTerm, onChange }) => (
  <Card className="mb-6">
    <div className="p-4 relative">
      <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 text-gray-400" />
      <Input
        placeholder="Search donations..."
        value={searchTerm}
        onChange={onChange}
        className="pl-10"
      />
    </div>
  </Card>
);

/** Table row displaying a single donation record. */
const DonationRow: React.FC<{
  donation: Donation;
  onView: (d: Donation) => void;
}> = ({ donation, onView }) => (
  <tr>
    <td className="px-6 py-4 whitespace-nowrap">
      <span className="text-sm font-mono text-gray-900">
        {donation.id.substring(0, 8)}...
      </span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
      {formatDate(donation.created_at)}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
      {donation.charity?.charity_details?.name || "Unknown Charity"}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
      {formatCurrency(donation.amount)}
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onView(donation)}
        className="text-indigo-600 hover:text-indigo-900"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </td>
  </tr>
);

/** Column displaying transaction details: ID, date, and amount. */
const TransactionInfo: React.FC<{ donation: Donation }> = ({ donation }) => (
  <div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Transaction Information
    </h3>
    <div className="space-y-3">
      <div>
        <p className="text-sm text-gray-500">Transaction ID</p>
        <p className="font-mono text-sm">{donation.id}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Date</p>
        <p className="font-medium">{formatDate(donation.created_at, true)}</p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Amount</p>
        <p className="font-medium">{formatCurrency(donation.amount)}</p>
      </div>
    </div>
  </div>
);

/**
 * Renders information about the parties involved in the donation.
 * @param {Donation} donation - The donation object containing donor and charity info.
 * @returns JSX.Element - The rendered parties information.
 */
const PartiesInfo: React.FC<{ donation: Donation }> = ({ donation }) => (
  <div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Parties</h3>
    <div className="space-y-3">
      <div>
        <p className="text-sm text-gray-500">Donor ID</p>
        <p className="font-mono text-sm">
          {donation.donor_id}
          <a
            href={`https://app.supabase.com/project/etqbojasfmpieigeefdj/editor/table/profiles/row/${donation.donor_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-900 ml-2 inline-block align-middle"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Charity</p>
        <p className="font-medium">
          {donation.charity?.charity_details?.name || "Unknown Charity"}
          <a
            href={`https://app.supabase.com/project/etqbojasfmpieigeefdj/editor/table/charity_details/row/${donation.charity_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-900 ml-2 inline-block align-middle"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>
    </div>
  </div>
);

/**
 * Renders the header section of the donation details modal, including the title and a close button.
 * @param {() => void} onClose - Callback function triggered when the close button is clicked.
 * @returns JSX.Element - The rendered modal header.
 */
const ModalHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="p-6 border-b border-gray-200 flex justify-between items-center">
    <h2 className="text-xl font-semibold text-gray-900">Donation Details</h2>
    <Button variant="ghost" size="sm" onClick={onClose}>
      <XCircle className="h-5 w-5" />
    </Button>
  </div>
);

/**
 * Renders a modal view displaying details of a specific donation.
 * @param {Donation} donation - The donation object to display.
 * @param {() => void} onClose - Callback function to close the modal.
 * @returns JSX.Element - The rendered donation view modal.
 */
const DonationViewModal: React.FC<{
  donation: Donation;
  onClose: () => void;
}> = ({ donation, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
      <ModalHeader onClose={onClose} />
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <TransactionInfo donation={donation} />
        <PartiesInfo donation={donation} />
      </div>
      <div className="p-6 border-t border-gray-200 flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  </div>
);

/* ── Main component ─────────────────────────────────────────────── */

/**
 * AdminDonations component displays and manages donation records for administrators.
 * @returns JSX.Element - The rendered component.
 */
const AdminDonations: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(
    null,
  );
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  /**
   * fetchDonations retrieves donations from the supabase database and updates the component state.
   * @async
   * @returns {Promise<void>} - A promise that resolves when the fetch operation completes.
   */
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

  useEffect(() => {
    fetchDonations();
  }, []);

  /**
   * handleSearch updates the search term state based on user input.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The change event from the search input.
   * @returns {void}
   */
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

  /**
   * handleView opens the view modal for a selected donation.
   * @param {Donation} donation - The donation to view.
   * @returns {void}
   */
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
      <PageHeader loading={loading} onRefresh={fetchDonations} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <SearchCard searchTerm={searchTerm} onChange={handleSearch} />

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
                <DonationRow
                  key={donation.id}
                  donation={donation}
                  onView={handleView}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {isViewModalOpen && selectedDonation && (
        <DonationViewModal
          donation={selectedDonation}
          onClose={() => setIsViewModalOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDonations;
