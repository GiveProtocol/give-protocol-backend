import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Search, AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";
import { formatCurrency } from "@/utils/money";
import { formatDate } from "@/utils/date";
import { Logger } from "@/utils/logger";
import { useDonation } from "@/hooks/web3/useDonation";

interface WithdrawalRequest {
  id: string;
  charity_id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  processed_at: string | null;
  charity?: {
    id: string;
    user_id: string;
    type: string;
    charity_details?: {
      name: string;
    };
  };
}

const AdminWithdrawals: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<WithdrawalRequest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processingTransaction, setProcessingTransaction] = useState(false);
  const { withdraw } = useDonation();

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("withdrawal_requests")
        .select(
          `
          *,
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

      setWithdrawals(data || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch withdrawals";
      setError(message);
      Logger.error("Admin withdrawals fetch error", { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredWithdrawals = withdrawals.filter((withdrawal) => {
    const charityName = withdrawal.charity?.charity_details?.name || "";
    const withdrawalId = withdrawal.id || "";
    const charityId = withdrawal.charity_id || "";
    const status = withdrawal.status || "";

    return (
      charityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      charityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleView = useCallback((withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setIsViewModalOpen(true);
  }, []);

  const handleApprove = useCallback((withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setIsApproveModalOpen(true);
  }, []);

  const handleReject = useCallback((withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setRejectReason("");
    setIsRejectModalOpen(true);
  }, []);

  const confirmApprove = useCallback(async () => {
    if (!selectedWithdrawal) return;

    try {
      setLoading(true);
      setProcessingTransaction(true);

      // First, initiate the blockchain transaction
      try {
        // Call the withdraw function from useDonation hook
        // This will execute the actual blockchain transaction
        await withdraw(selectedWithdrawal.amount.toString());

        Logger.info("Blockchain withdrawal successful", {
          withdrawalId: selectedWithdrawal.id,
          amount: selectedWithdrawal.amount,
        });

        // Now update the database to reflect the successful withdrawal
        const { error: updateError } = await supabase
          .from("withdrawal_requests")
          .update({
            status: "approved",
            processed_at: new Date().toISOString(),
          })
          .eq("id", selectedWithdrawal.id);

        if (updateError) throw updateError;

        // Update the charity's available balance in the database
        const { error: balanceUpdateError } = await supabase
          .from("charity_details")
          .update({
            available_balance: supabase.rpc("increment_balance", {
              row_id: selectedWithdrawal.charity_id,
              amount: -selectedWithdrawal.amount, // Negative amount to decrease balance
            }),
          })
          .eq("profile_id", selectedWithdrawal.charity_id);

        if (balanceUpdateError) throw balanceUpdateError;
      } catch (txError) {
        // If blockchain transaction fails, update the withdrawal status to rejected
        Logger.error("Blockchain withdrawal failed", {
          error: txError,
          withdrawalId: selectedWithdrawal.id,
        });

        const { error: updateError } = await supabase
          .from("withdrawal_requests")
          .update({
            status: "rejected",
            processed_at: new Date().toISOString(),
          })
          .eq("id", selectedWithdrawal.id);

        if (updateError) throw updateError;

        throw new Error(
          "Blockchain transaction failed. Withdrawal request has been rejected.",
        );
      }

      setIsApproveModalOpen(false);
      setSelectedWithdrawal(null);

      // Refresh the list
      await fetchWithdrawals();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to approve withdrawal";
      setError(message);
      Logger.error("Admin withdrawal approve error", { error: err });
    } finally {
      setLoading(false);
      setProcessingTransaction(false);
    }
  }, [selectedWithdrawal, withdraw, fetchWithdrawals]);

  const confirmReject = useCallback(async () => {
    if (!selectedWithdrawal) return;

    try {
      setLoading(true);

      const { error: updateError } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
        })
        .eq("id", selectedWithdrawal.id);

      if (updateError) throw updateError;

      setIsRejectModalOpen(false);
      setSelectedWithdrawal(null);
      setRejectReason("");

      // Refresh the list
      await fetchWithdrawals();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reject withdrawal";
      setError(message);
      Logger.error("Admin withdrawal reject error", { error: err });
    } finally {
      setLoading(false);
    }
  }, [selectedWithdrawal, fetchWithdrawals]);

  const closeViewModal = useCallback(() => {
    setIsViewModalOpen(false);
  }, []);

  const closeApproveModal = useCallback(() => {
    setIsApproveModalOpen(false);
  }, []);

  const closeRejectModal = useCallback(() => {
    setIsRejectModalOpen(false);
  }, []);

  const handleRejectReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setRejectReason(e.target.value);
    },
    [],
  );

  if (loading && withdrawals.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Withdrawal Requests
        </h1>
        <Button onClick={fetchWithdrawals} disabled={loading}>
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
              placeholder="Search withdrawals..."
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
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
              {filteredWithdrawals.map((withdrawal) => (
                <tr key={withdrawal.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">
                      {withdrawal.id.substring(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(withdrawal.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {withdrawal.charity?.charity_details?.name ||
                        "Unknown Charity"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(withdrawal.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        withdrawal.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : withdrawal.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {withdrawal.status.charAt(0).toUpperCase() +
                        withdrawal.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(withdrawal)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {withdrawal.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(withdrawal)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(withdrawal)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Modal */}
      {isViewModalOpen && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Withdrawal Details
                </h2>
                <Button variant="ghost" size="sm" onClick={closeViewModal}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Request Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Request ID</p>
                      <p className="font-mono text-sm">
                        {selectedWithdrawal.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date Requested</p>
                      <p className="font-medium">
                        {formatDate(selectedWithdrawal.created_at, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className="font-medium">
                        {formatCurrency(selectedWithdrawal.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedWithdrawal.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : selectedWithdrawal.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {selectedWithdrawal.status.charAt(0).toUpperCase() +
                          selectedWithdrawal.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Charity Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Charity Name</p>
                      <p className="font-medium">
                        {selectedWithdrawal.charity?.charity_details?.name ||
                          "Unknown Charity"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Charity ID</p>
                      <p className="font-mono text-sm">
                        {selectedWithdrawal.charity_id}
                      </p>
                    </div>
                    {selectedWithdrawal.processed_at && (
                      <div>
                        <p className="text-sm text-gray-500">Processed At</p>
                        <p className="font-medium">
                          {formatDate(selectedWithdrawal.processed_at, true)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button onClick={closeViewModal}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {isApproveModalOpen && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Confirm Approval
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to approve the withdrawal request for{" "}
                <span className="font-semibold">
                  {formatCurrency(selectedWithdrawal.amount)}
                </span>{" "}
                from{" "}
                <span className="font-semibold">
                  {selectedWithdrawal.charity?.charity_details?.name ||
                    "Unknown Charity"}
                </span>
                ?
              </p>

              {processingTransaction && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span>Processing blockchain transaction...</span>
                </div>
              )}

              <div className="flex justify-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={closeApproveModal}
                  disabled={processingTransaction || loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmApprove}
                  disabled={processingTransaction || loading}
                >
                  {loading ? "Processing..." : "Approve Withdrawal"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {isRejectModalOpen && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-red-100 rounded-full p-3">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Confirm Rejection
              </h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                Are you sure you want to reject the withdrawal request for{" "}
                <span className="font-semibold">
                  {formatCurrency(selectedWithdrawal.amount)}
                </span>{" "}
                from{" "}
                <span className="font-semibold">
                  {selectedWithdrawal.charity?.charity_details?.name ||
                    "Unknown Charity"}
                </span>
                ?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={handleRejectReasonChange}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter reason for rejection..."
                />
              </div>
              <div className="flex justify-center space-x-3">
                <Button variant="secondary" onClick={closeRejectModal}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmReject}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Reject Withdrawal"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawals;
