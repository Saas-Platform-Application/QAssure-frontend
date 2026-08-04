import { useState, useEffect } from 'react';
import { Layout } from "@/components/layout/Layout";
import { Loader2, Info, Shield } from "lucide-react";
import { useAppSelector } from "@/hooks/redux-hooks";
import { smtpConfigService, type SmtpConfig } from "@/services/smtp-config-service";
import { showToast } from "@/utils/toast";
import { PrimaryButton, SecondaryButton, FormField, StatusBadge } from "@/components/shared";

const SmtpSettings = () => {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const [config, setConfig] = useState<Partial<SmtpConfig>>({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    from_name: '',
    from_email: '',
    is_active: true,
    scope: 'tenant'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [tenantId]);

  const fetchConfig = async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const res = await smtpConfigService.getConfig(tenantId);
      if (res.success && res.data) {
        setConfig({
          ...res.data,
          password: '' // Don't show password
        });
        setHasExistingConfig(true);
      } else {
        setHasExistingConfig(false);
      }
    } catch (err) {
      // It's fine if no config exists, it will fallback to global
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await smtpConfigService.testConnection(config);
      if (res.success) {
        showToast.success('SMTP connection verified successfully');
      } else {
        showToast.error(`Connection failed: ${res.message}`);
      }
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMsg = typeof errorData === 'string' ? errorData : errorData?.message;
      showToast.error(errorMsg || err.response?.data?.message || 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await smtpConfigService.upsertConfig({
        ...config,
        tenant_id: tenantId || undefined,
        scope: 'tenant'
      });
      showToast.success('SMTP settings saved successfully');
      setHasExistingConfig(true);
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMsg = typeof errorData === 'string' ? errorData : errorData?.message;
      showToast.error(errorMsg || err.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout currentPage="Settings" pageHeader={{ title: "SMTP Settings", description: "Loading configurations..." }}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      currentPage="Settings"
      pageHeader={{
        title: "SMTP Settings",
        description: "Configure your own email delivery infrastructure for notifications.",
      }}
    >
      <div className="flex flex-col gap-6 max-w-4xl">
        {!hasExistingConfig && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-4 items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Using Platform Defaults</p>
              <p className="text-sm text-blue-700 mt-1">
                You haven't configured a custom SMTP. The platform is currently using the global fallback SMTP settings for sending your emails. 
                Configure your own settings below to send emails from your own domain.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Custom SMTP Configuration</h3>
              <p className="text-xs text-gray-500 mt-0.5">Define your outgoing mail server details</p>
            </div>
            {hasExistingConfig && (
              <StatusBadge variant={config.is_active ? 'success' : 'failure'}>
                {config.is_active ? 'Configured & Active' : 'Inactive'}
              </StatusBadge>
            )}
          </div>

          <div className="p-4 md:p-6 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <FormField
                  label="SMTP Host"
                  value={config.host}
                  onChange={(e) => setConfig({ ...config, host: e.target.value })}
                  placeholder="smtp.your-company.com"
                />
              </div>
              <FormField
                label="Port"
                type="number"
                value={config.port?.toString()}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                placeholder="587"
              />
            </div>

            <div className="flex items-center gap-6 py-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.secure}
                  onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Use SSL/TLS</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.is_active}
                  onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable SMTP</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-50">
              <FormField
                label="Username / Email"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                placeholder="notifications@yourdomain.com"
              />
              <FormField
                label="Password"
                type="password"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                placeholder={hasExistingConfig ? '••••••••' : 'Your SMTP password'}
                helperText={hasExistingConfig ? "Leave blank to keep existing password" : ""}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Sender Display Name"
                value={config.from_name || ''}
                onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                placeholder="Your Company Notifications"
              />
              <FormField
                label="Sender Email"
                type="email"
                value={config.from_email || ''}
                onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                placeholder="noreply@yourdomain.com"
              />
            </div>
          </div>

          <div className="px-4 md:px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <SecondaryButton 
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !config.host || !config.username}
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </SecondaryButton>

            <PrimaryButton 
              type="button"
              onClick={handleSave}
              disabled={isSaving || !config.host || !config.username}
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SmtpSettings;
