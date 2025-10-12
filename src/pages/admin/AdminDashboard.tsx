import React, { useState, useCallback } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import {
  Users,
  Building,
  DollarSign,
  Clock,
  Shield,
  BarChart,
  Settings,
  Database,
  FileText,
  AlertTriangle,
  Menu,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import AdminCharities from "./AdminCharities";
import AdminDonations from "./AdminDonations";
import AdminUsers from "./AdminUsers";
import AdminWithdrawals from "./AdminWithdrawals";
import AdminVerifications from "./AdminVerifications";
import AdminSettings from "./AdminSettings";
import AdminStats from "./AdminStats";
import AdminLogs from "./AdminLogs";

type AdminTab =
  | "dashboard"
  | "charities"
  | "donations"
  | "users"
  | "withdrawals"
  | "verifications"
  | "settings"
  | "logs";

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleTabChange = useCallback((tab: AdminTab) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Check if user is admin
  if (profile?.type !== "admin") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">
            Access Denied
          </h2>
          <p className="text-red-600 mb-4">
            You don't have permission to access the admin panel.
          </p>
          <Link to="/">
            <Button>Return to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminStats />;
      case "charities":
        return <AdminCharities />;
      case "donations":
        return <AdminDonations />;
      case "users":
        return <AdminUsers />;
      case "withdrawals":
        return <AdminWithdrawals />;
      case "verifications":
        return <AdminVerifications />;
      case "settings":
        return <AdminSettings />;
      case "logs":
        return <AdminLogs />;
      default:
        return <AdminStats />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed top-4 left-4 z-20">
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleSidebar}
          className="rounded-full p-2 shadow-md"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-10 w-64 bg-white shadow-md h-full transition-transform duration-300 ease-in-out`}
      >
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500">Dev3 Back-End</p>
        </div>
        <nav className="mt-6 overflow-y-auto h-[calc(100vh-88px)]">
          <ul className="space-y-2 px-4">
            <li>
              <button
                onClick={() => handleTabChange("dashboard")}
                className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === "dashboard"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <BarChart className="h-5 w-5 mr-3" />
                Dashboard
              </button>
            </li>
            <li>
              <button
                onClick={() => handleTabChange("charities")}
                className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === "charities"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Building className="h-5 w-5 mr-3" />
                Charities
              </button>
            </li>
            <li>
              <button
                onClick={() => handleTabChange("donations")}
                className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === "donations"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <DollarSign className="h-5 w-5 mr-3" />
                Donations
              </button>
            </li>
            <li>
              <button
                onClick={() => handleTabChange("users")}
                className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === "users"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Users className="h-5 w-5 mr-3" />
                Users
              </button>
            </li>
            <li>
              <button
                onClick={() => handleTabChange("withdrawals")}
                className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === "withdrawals"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Clock className="h-5 w-5 mr-3" />
                Withdrawals
              </button>
            </li>
            <li>
              <button
                onClick={() => handleTabChange("verifications")}
                className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === "verifications"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Shield className="h-5 w-5 mr-3" />
                Verifications
              </button>
            </li>
            <li>
              <button
                onClick={() => handleTabChange("logs")}
                className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === "logs"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FileText className="h-5 w-5 mr-3" />
                Audit Logs
              </button>
            </li>
            <li>
              <button
                onClick={() => handleTabChange("settings")}
                className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-md ${
                  activeTab === "settings"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 md:ml-0 overflow-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
