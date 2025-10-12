import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  DollarSign,
  Users,
  Building,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/utils/money";
import { Logger } from "@/utils/logger";

interface AdminStats {
  totalDonations: number;
  totalDonationAmount: number;
  totalUsers: number;
  totalCharities: number;
  pendingWithdrawals: number;
  pendingVerifications: number;
}

const AdminStats: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get total donations count
        const { count: donationsCount, error: donationsError } = await supabase
          .from("donations")
          .select("*", { count: "exact", head: true });

        if (donationsError) throw donationsError;

        // Get total donation amount
        const { data: donationAmountData, error: amountError } = await supabase
          .from("donations")
          .select("amount");

        if (amountError) throw amountError;

        const totalAmount = donationAmountData.reduce(
          (sum, donation) => sum + Number(donation.amount),
          0,
        );

        // Get total users count
        const { count: usersCount, error: usersError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        if (usersError) throw usersError;

        // Get total charities count
        const { count: charitiesCount, error: charitiesError } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("type", "charity");

        if (charitiesError) throw charitiesError;

        // Get pending withdrawals count
        const { count: withdrawalsCount, error: withdrawalsError } =
          await supabase
            .from("withdrawal_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending");

        if (withdrawalsError) throw withdrawalsError;

        // Get pending verifications count
        const { count: verificationsCount, error: verificationsError } =
          await supabase
            .from("charity_documents")
            .select("*", { count: "exact", head: true })
            .eq("verified", false);

        if (verificationsError) throw verificationsError;

        setStats({
          totalDonations: donationsCount || 0,
          totalDonationAmount: totalAmount,
          totalUsers: usersCount || 0,
          totalCharities: charitiesCount || 0,
          pendingWithdrawals: withdrawalsCount || 0,
          pendingVerifications: verificationsCount || 0,
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to fetch admin statistics";
        setError(message);
        Logger.error("Admin stats fetch error", { error: err });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Donations
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.totalDonations.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(stats?.totalDonationAmount || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.totalUsers.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Building className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Charities
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.totalCharities.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <Clock className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Pending Withdrawals
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.pendingWithdrawals.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Pending Verifications
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.pendingVerifications.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <p className="text-gray-500 text-center py-8">
            Activity chart will be displayed here
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            System Status
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Database</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Healthy
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">API Services</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Operational
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Storage</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Online
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Authentication</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Active
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminStats;
