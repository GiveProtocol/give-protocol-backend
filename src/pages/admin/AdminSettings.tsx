import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Save,
  AlertTriangle,
  RefreshCw,
  Database,
  Shield,
  Server,
} from "lucide-react";
import { Logger } from "@/utils/logger";

interface SystemSettings {
  maxLoginAttempts: number;
  loginCooldownMinutes: number;
  cacheTtlMinutes: number;
  apiTimeoutMs: number;
  enableAnalytics: boolean;
  analyticsSampleRate: number;
}

interface SettingsCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

/**
 * SettingsCard renders a card with an icon header and content section.
 * @param props SettingsCardProps containing icon, title, and children.
 * @returns JSX.Element The rendered settings card.
 */
const SettingsCard: React.FC<SettingsCardProps> = ({ icon, title, children }) => (
  <Card className="p-6">
    <div className="flex items-center mb-4">
      {icon}
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
    {children}
  </Card>
);

interface PageHeaderProps {
  saving: boolean;
  onReset: () => void;
  onSave: () => void;
}

/**
 * PageHeader renders the settings page title and action buttons.
 * @param props PageHeaderProps containing saving state and handlers.
 * @returns JSX.Element The rendered page header.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ saving, onReset, onSave }) => (
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
    <div className="flex space-x-3">
      <Button
        variant="secondary"
        onClick={onReset}
        className="flex items-center"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Reset to Defaults
      </Button>
      <Button
        onClick={onSave}
        disabled={saving}
        className="flex items-center"
      >
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  </div>
);

interface DangerActionProps {
  title: string;
  description: string;
  buttonLabel: string;
}

/**
 * DangerAction renders a bordered danger zone action item.
 * @param props DangerActionProps containing title, description, and button label.
 * @returns JSX.Element The rendered danger action.
 */
const DangerAction: React.FC<DangerActionProps> = ({ title, description, buttonLabel }) => (
  <div className="border border-red-200 rounded-md p-4">
    <h3 className="text-md font-medium text-red-800 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 mb-4">{description}</p>
    <Button variant="danger" size="sm">
      {buttonLabel}
    </Button>
  </div>
);

/** Grid of settings cards for security, cache, API, and analytics. */
interface SettingsFieldsProps {
  settings: SystemSettings;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Security settings fields: max login attempts and cooldown. */
const SecurityFields: React.FC<SettingsFieldsProps> = ({ settings, handleChange }) => (
  <div className="space-y-4">
    <Input
      label="Max Login Attempts"
      name="maxLoginAttempts"
      type="number"
      min="1"
      max="10"
      value={settings.maxLoginAttempts}
      onChange={handleChange}
      helperText="Number of failed login attempts before account lockout"
    />
    <Input
      label="Login Cooldown (minutes)"
      name="loginCooldownMinutes"
      type="number"
      min="5"
      max="60"
      value={settings.loginCooldownMinutes}
      onChange={handleChange}
      helperText="Duration of account lockout after max failed attempts"
    />
  </div>
);

/** Analytics settings fields: enable toggle and sample rate. */
const AnalyticsFields: React.FC<SettingsFieldsProps> = ({ settings, handleChange }) => (
  <div className="space-y-4">
    <div className="flex items-center">
      <input
        id="enableAnalytics"
        name="enableAnalytics"
        type="checkbox"
        checked={settings.enableAnalytics}
        onChange={handleChange}
        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
      />
      <label
        htmlFor="enableAnalytics"
        className="ml-2 block text-sm text-gray-900"
      >
        Enable Analytics
      </label>
    </div>
    <Input
      label="Analytics Sample Rate"
      name="analyticsSampleRate"
      type="number"
      min="0.01"
      max="1"
      step="0.01"
      value={settings.analyticsSampleRate}
      onChange={handleChange}
      helperText="Percentage of users to include in analytics (0.1 = 10%)"
      disabled={!settings.enableAnalytics}
    />
  </div>
);

/** Grid of settings cards for security, cache, API, and analytics. */
const SettingsGrid: React.FC<{
  settings: SystemSettings;
  analyticsIcon: React.ReactNode;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ settings, analyticsIcon, handleChange }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <SettingsCard
      icon={<Shield className="h-5 w-5 text-indigo-600 mr-2" />}
      title="Security Settings"
    >
      <SecurityFields settings={settings} handleChange={handleChange} />
    </SettingsCard>

    <SettingsCard
      icon={<Database className="h-5 w-5 text-indigo-600 mr-2" />}
      title="Cache Settings"
    >
      <Input
        label="Cache TTL (minutes)"
        name="cacheTtlMinutes"
        type="number"
        min="1"
        max="60"
        value={settings.cacheTtlMinutes}
        onChange={handleChange}
        helperText="Time-to-live for cached data"
      />
    </SettingsCard>

    <SettingsCard
      icon={<Server className="h-5 w-5 text-indigo-600 mr-2" />}
      title="API Settings"
    >
      <Input
        label="API Timeout (ms)"
        name="apiTimeoutMs"
        type="number"
        min="1000"
        max="30000"
        step="1000"
        value={settings.apiTimeoutMs}
        onChange={handleChange}
        helperText="Timeout for API requests in milliseconds"
      />
    </SettingsCard>

    <SettingsCard icon={analyticsIcon} title="Analytics Settings">
      <AnalyticsFields settings={settings} handleChange={handleChange} />
    </SettingsCard>
  </div>
);

/** Danger zone section with destructive actions. */
const DangerZoneSection: React.FC = () => (
  <div className="mt-6">
    <SettingsCard
      icon={<AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />}
      title="Danger Zone"
    >
      <div className="space-y-4">
        <DangerAction
          title="Reset Database"
          description="This will reset all data in the database to its initial state. This action cannot be undone."
          buttonLabel="Reset Database"
        />
        <DangerAction
          title="Clear All Logs"
          description="This will delete all system logs. This action cannot be undone."
          buttonLabel="Clear Logs"
        />
      </div>
    </SettingsCard>
  </div>
);

/**
 * AdminSettings component displays and allows editing of system settings.
 * @returns JSX.Element The rendered admin settings component.
 */
const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    maxLoginAttempts: 5,
    loginCooldownMinutes: 15,
    cacheTtlMinutes: 5,
    apiTimeoutMs: 10000,
    enableAnalytics: true,
    analyticsSampleRate: 0.1,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // In a real implementation, you would fetch settings from the database
    // For now, we'll just use the default values
    setLoading(false);
  }, []);

  /**
   * Handles changes to input fields and updates the settings state.
   * @param e React.ChangeEvent<HTMLInputElement> The change event from the input field.
   * @returns void
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setSettings((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? Number(value)
            : value,
    }));
  };

  /**
   * Saves the current settings, simulating a delay and logging the update.
   * @returns Promise<void> A promise that resolves when save operation completes.
   */
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // In a real implementation, you would save settings to the database
      // For now, we'll just simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess("Settings saved successfully");

      // Log the settings change
      Logger.info("Admin settings updated", { settings });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save settings";
      setError(message);
      Logger.error("Admin settings save error", { error: err });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Resets settings to default values and clears error, sets success message.
   * @returns void
   */
  const handleReset = () => {
    setSettings({
      maxLoginAttempts: 5,
      loginCooldownMinutes: 15,
      cacheTtlMinutes: 5,
      apiTimeoutMs: 10000,
      enableAnalytics: true,
      analyticsSampleRate: 0.1,
    });
    setError(null);
    setSuccess("Settings reset to defaults");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const analyticsIcon = (
    <svg
      className="h-5 w-5 text-indigo-600 mr-2"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );

  return (
    <>
      <PageHeader saving={saving} onReset={handleReset} onSave={handleSave} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          {success}
        </div>
      )}

      <SettingsGrid
        settings={settings}
        analyticsIcon={analyticsIcon}
        handleChange={handleChange}
      />

      <DangerZoneSection />
    </>
  );
};

export default AdminSettings;
