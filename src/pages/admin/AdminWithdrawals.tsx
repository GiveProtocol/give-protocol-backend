import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Search, CheckCircle, XCircle, Eye } from 'lucide-react';
import { formatCurrency } from '@/utils/money';
import { formatDate } from '@/utils/date';
import { Logger } from '@/utils/logger';
import { useDonation } from '@/hooks/web3/useDonation';

interface WithdrawalRequest {
  id: string;
  charity_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
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

/**
 * Returns the CSS classes for a status badge based on the provided status.
 *
 * @param status - The status of the withdrawal ('approved', 'rejected', or others).
 * @returns A string containing the CSS classes for styling the badge.
 */
function getStatusBadgeClass(status: string): string {
  if (status === 'approved') return 'bg-green-100 text-green-800';
  if (status === 'rejected') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
}

/**
 * Capitalizes the first character of a status string.
 *
 * @param {string} status - The status string to capitalize.
 * @returns {string} The status string with its first letter capitalized.
 */
function capitalizeStatus(status: string): string {
  if (!status) {
    return status;
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface DetailFieldProps {
  label: string;
  children: React.ReactNode;
}

/** Labeled field displaying a label above its children content. */
const DetailField: React.FC<DetailFieldProps> = ({ label, children }) => (
  <div>
    <p className="text-sm text-gray-500">{label}</p>
    {children}
  </div>
);

interface RequestInfoColumnProps {
  withdrawal: WithdrawalRequest;
}

/** Column displaying withdrawal request details: ID, date, amount, and status. */
const RequestInfoColumn: React.FC<RequestInfoColumnProps> = ({ withdrawal }) => (
  <div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Request Information</h3>
    <div className="space-y-3">
      <DetailField label="Request ID">
        <p className="font-mono text-sm">{withdrawal.id}</p>
      </DetailField>
      <DetailField label="Date Requested">
        <p className="font-medium">{formatDate(withdrawal.created_at, true)}</p>
      </DetailField>
      <DetailField label="Amount">
        <p className="font-medium">{formatCurrency(withdrawal.amount)}</p>
      </DetailField>
      <DetailField label="Status">
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(withdrawal.status)}`}>
          {capitalizeStatus(withdrawal.status)}
        </span>
      </DetailField>
    </div>
  </div>
);

interface CharityInfoColumnProps {
  withdrawal: WithdrawalRequest;
}

/** Column displaying charity details: name, ID, and processing date. */
const CharityInfoColumn: React.FC<CharityInfoColumnProps> = ({ withdrawal }) => (
  <div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Charity Information</h3>
    <div className="space-y-3">
      <DetailField label="Charity Name">
        <p className="font-medium">{withdrawal.charity?.charity_details?.name || 'Unknown Charity'}</p>
      </DetailField>
      <DetailField label="Charity ID">
        <p className="font-mono text-sm">{withdrawal.charity_id}</p>
      </DetailField>
      {withdrawal.processed_at && (
        <DetailField label="Processed At">
          <p className="font-medium">{formatDate(withdrawal.processed_at, true)}</p>
        </DetailField>
      )}
    </div>
  </div>
);

interface WithdrawalViewModalProps {
  withdrawal: WithdrawalRequest;
  onClose: () => void;
}

/** Header bar for the withdrawal view modal with title and close button. */
const ViewModalHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="flex justify-between items-center">
    <h2 className="text-xl font-semibold text-gray-900">Withdrawal Details</h2>
    <Button variant="ghost" size="sm" onClick={onClose}>
      <XCircle className="h-5 w-5" />
    </Button>
  </div>
);

/** Modal showing full withdrawal request and charity details. */
const WithdrawalViewModal: React.FC<WithdrawalViewModalProps> = ({ withdrawal, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
      <div className="p-6 border-b border-gray-200">
        <ViewModalHeader onClose={onClose} />
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RequestInfoColumn withdrawal={withdrawal} />
          <CharityInfoColumn withdrawal={withdrawal} />
        </div>
      </div>
      <div className="p-6 border-t border-gray-200 flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  </div>
);

interface ApproveConfirmModalProps {
  withdrawal: WithdrawalRequest;
  processingTransaction: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Inner content for the approve confirmation modal. */
const ApproveConfirmContent: React.FC<ApproveConfirmModalProps> = ({
  withdrawal, processingTransaction, loading, onClose, onConfirm
}) => (
  <div className="p-6">
    <div className="bg-green-100 rounded-full p-3 mx-auto mb-4 w-fit">
      <CheckCircle className="h-6 w-6 text-green-600" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Confirm Approval</h3>
    <p className="text-sm text-gray-500 text-center mb-6">
      Are you sure you want to approve the withdrawal request for <span className="font-semibold">{formatCurrency(withdrawal.amount)}</span> from <span className="font-semibold">{withdrawal.charity?.charity_details?.name || 'Unknown Charity'}</span>?
    </p>
    {processingTransaction && (
      <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md flex items-center justify-center">
        <LoadingSpinner size="sm" className="mr-2" />
        <span>Processing blockchain transaction...</span>
      </div>
    )}
    <div className="flex justify-center space-x-3">
      <Button variant="secondary" onClick={onClose} disabled={processingTransaction || loading}>
        Cancel
      </Button>
      <Button onClick={onConfirm} disabled={processingTransaction || loading}>
        {loading ? 'Processing...' : 'Approve Withdrawal'}
      </Button>
    </div>
  </div>
);

/** Confirmation dialog for approving a withdrawal request with blockchain processing. */
const ApproveConfirmModal: React.FC<ApproveConfirmModalProps> = (props) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
      <ApproveConfirmContent {...props} />
    </div>
  </div>
);

interface RejectConfirmModalProps {
  withdrawal: WithdrawalRequest;
  rejectReason: string;
  loading: boolean;
  onReasonChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onClose: () => void;
  onConfirm: () => void;
}

/** Inner content for the reject confirmation modal. */
const RejectConfirmContent: React.FC<RejectConfirmModalProps> = ({
  withdrawal, rejectReason, loading, onReasonChange, onClose, onConfirm
}) => (
  <div className="p-6">
    <div className="bg-red-100 rounded-full p-3 mx-auto mb-4 w-fit">
      <XCircle className="h-6 w-6 text-red-600" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Confirm Rejection</h3>
    <p className="text-sm text-gray-500 text-center mb-4">
      Are you sure you want to reject the withdrawal request for <span className="font-semibold">{formatCurrency(withdrawal.amount)}</span> from <span className="font-semibold">{withdrawal.charity?.charity_details?.name || 'Unknown Charity'}</span>?
    </p>
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Reason for Rejection (Optional)
      </label>
      <textarea
        value={rejectReason}
        onChange={onReasonChange}
        rows={3}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        placeholder="Enter reason for rejection..."
      />
    </div>
    <div className="flex justify-center space-x-3">
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="danger" onClick={onConfirm} disabled={loading}>
        {loading ? 'Processing...' : 'Reject Withdrawal'}
      </Button>
    </div>
  </div>
);

/** Confirmation dialog for rejecting a withdrawal request with optional reason. */
const RejectConfirmModal: React.FC<RejectConfirmModalProps> = (props) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
      <RejectConfirmContent {...props} />
    </div>
  </div>
);

interface WithdrawalRowActionsProps {
  withdrawal: WithdrawalRequest;
  onView: (w: WithdrawalRequest) => void;
  onApprove: (w: WithdrawalRequest) => void;
  onReject: (w: WithdrawalRequest) => void;
}

/** Action buttons for viewing, approving, or rejecting a withdrawal row. */
const WithdrawalRowActions: React.FC<WithdrawalRowActionsProps> = ({
  withdrawal, onView, onApprove, onReject
}) => (
  <div className="flex justify-end space-x-2">
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onView(withdrawal)}
      className="text-indigo-600 hover:text-indigo-900"
    >
      <Eye className="h-4 w-4" />
    </Button>
    {withdrawal.status === 'pending' && (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onApprove(withdrawal)}
          className="text-green-600 hover:text-green-900"
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReject(withdrawal)}
          className="text-red-600 hover:text-red-900"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </>
    )}
  </div>
);

interface WithdrawalRowProps {
  withdrawal: WithdrawalRequest;
  onView: (w: WithdrawalRequest) => void;
  onApprove: (w: WithdrawalRequest) => void;
  onReject: (w: WithdrawalRequest) => void;
}

/** Table row displaying a single withdrawal request with status and actions. */
const WithdrawalRow: React.FC<WithdrawalRowProps> = ({
  withdrawal, onView, onApprove, onReject
}) => (
  <tr>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm font-mono text-gray-900">{withdrawal.id.substring(0, 8)}...</div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm text-gray-900">{formatDate(withdrawal.created_at)}</div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm text-gray-900">{withdrawal.charity?.charity_details?.name || 'Unknown Charity'}</div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="text-sm text-gray-900">{formatCurrency(withdrawal.amount)}</div>
    </td>
    <td className="px-6 py-4 whitespace-nowrap">
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(withdrawal.status)}`}>
        {capitalizeStatus(withdrawal.status)}
      </span>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
      <WithdrawalRowActions
        withdrawal={withdrawal}
        onView={onView}
        onApprove={onApprove}
        onReject={onReject}
      />
    </td>
  </tr>
);

interface TableHeaderCellProps {
  children: React.ReactNode;
  align?: 'left' | 'right';
}

/** Styled table header cell with uppercase text and configurable alignment. */
const TableHeaderCell: React.FC<TableHeaderCellProps> = ({ children, align = 'left' }) => (
  <th
    scope="col"
    className={`px-6 py-3 text-${align} text-xs font-medium text-gray-500 uppercase tracking-wider`}
  >
    {children}
  </th>
);

interface WithdrawalsTableCardProps {
  withdrawals: WithdrawalRequest[];
  onView: (w: WithdrawalRequest) => void;
  onApprove: (w: WithdrawalRequest) => void;
  onReject: (w: WithdrawalRequest) => void;
}

/** Table displaying withdrawal rows with header columns. */
const WithdrawalsTable: React.FC<WithdrawalsTableCardProps> = ({
  withdrawals, onView, onApprove, onReject
}) => (
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <TableHeaderCell>ID</TableHeaderCell>
        <TableHeaderCell>Date</TableHeaderCell>
        <TableHeaderCell>Charity</TableHeaderCell>
        <TableHeaderCell>Amount</TableHeaderCell>
        <TableHeaderCell>Status</TableHeaderCell>
        <TableHeaderCell align="right">Actions</TableHeaderCell>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {withdrawals.map((withdrawal) => (
        <WithdrawalRow
          key={withdrawal.id}
          withdrawal={withdrawal}
          onView={onView}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </tbody>
  </table>
);

/** Card containing the withdrawals data table with sortable columns. */
const WithdrawalsTableCard: React.FC<WithdrawalsTableCardProps> = (props) => (
  <Card className="overflow-x-auto">
    <WithdrawalsTable {...props} />
  </Card>
);

/** Admin page for managing charity withdrawal requests. */
const AdminWithdrawals: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingTransaction, setProcessingTransaction] = useState(false);
  const { withdraw } = useDonation();

  /** Fetch all withdrawal requests from the database. */
  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          charity:charity_id (
            id,
            user_id,
            type,
            charity_details:charity_details (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setWithdrawals(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch withdrawals';
      setError(message);
      Logger.error('Admin withdrawals fetch error', { error: err });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  /** Update the search filter term. */
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const charityName = withdrawal.charity?.charity_details?.name || '';
    const withdrawalId = withdrawal.id || '';
    const charityId = withdrawal.charity_id || '';
    const status = withdrawal.status || '';

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
    setRejectReason('');
    setIsRejectModalOpen(true);
  }, []);

  const confirmApprove = useCallback(async () => {
    if (!selectedWithdrawal) return;

    try {
      setLoading(true);
      setProcessingTransaction(true);

      try {
        await withdraw(selectedWithdrawal.amount.toString());

        Logger.info('Blockchain withdrawal successful', {
          withdrawalId: selectedWithdrawal.id,
          amount: selectedWithdrawal.amount
        });

        const { error: updateError } = await supabase
          .from('withdrawal_requests')
          .update({
            status: 'approved',
            processed_at: new Date().toISOString()
          })
          .eq('id', selectedWithdrawal.id);

        if (updateError) throw updateError;

        const { error: balanceUpdateError } = await supabase
          .from('charity_details')
          .update({
            available_balance: supabase.rpc('increment_balance', {
              row_id: selectedWithdrawal.charity_id,
              amount: -selectedWithdrawal.amount
            })
          })
          .eq('profile_id', selectedWithdrawal.charity_id);

        if (balanceUpdateError) throw balanceUpdateError;

      } catch (txError) {
        Logger.error('Blockchain withdrawal failed', {
          error: txError,
          withdrawalId: selectedWithdrawal.id
        });

        const { error: updateError } = await supabase
          .from('withdrawal_requests')
          .update({
            status: 'rejected',
            processed_at: new Date().toISOString()
          })
          .eq('id', selectedWithdrawal.id);

        if (updateError) throw updateError;

        throw new Error('Blockchain transaction failed. Withdrawal request has been rejected.');
      }

      setIsApproveModalOpen(false);
      setSelectedWithdrawal(null);

      await fetchWithdrawals();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve withdrawal';
      setError(message);
      Logger.error('Admin withdrawal approve error', { error: err });
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
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString()
        })
        .eq('id', selectedWithdrawal.id);

      if (updateError) throw updateError;

      setIsRejectModalOpen(false);
      setSelectedWithdrawal(null);
      setRejectReason('');

      await fetchWithdrawals();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject withdrawal';
      setError(message);
      Logger.error('Admin withdrawal reject error', { error: err });
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

  const handleRejectReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRejectReason(e.target.value);
  }, []);

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
        <h1 className="text-2xl font-bold text-gray-900">Withdrawal Requests</h1>
        <Button onClick={fetchWithdrawals} disabled={loading}>
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
              placeholder="Search withdrawals..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      <WithdrawalsTableCard
        withdrawals={filteredWithdrawals}
        onView={handleView}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {isViewModalOpen && selectedWithdrawal && (
        <WithdrawalViewModal
          withdrawal={selectedWithdrawal}
          onClose={closeViewModal}
        />
      )}

      {isApproveModalOpen && selectedWithdrawal && (
        <ApproveConfirmModal
          withdrawal={selectedWithdrawal}
          processingTransaction={processingTransaction}
          loading={loading}
          onClose={closeApproveModal}
          onConfirm={confirmApprove}
        />
      )}

      {isRejectModalOpen && selectedWithdrawal && (
        <RejectConfirmModal
          withdrawal={selectedWithdrawal}
          rejectReason={rejectReason}
          loading={loading}
          onReasonChange={handleRejectReasonChange}
          onClose={closeRejectModal}
          onConfirm={confirmReject}
        />
      )}
    </div>
  );
};

export default AdminWithdrawals;
