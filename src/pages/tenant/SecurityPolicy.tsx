import { useState, useEffect, type ReactElement } from "react";
import { Layout } from "@/components/layout/Layout";
import { 
  Shield, 
  Clock, 
  Lock, 
  Save, 
  Loader2, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { securityService, type PasswordPolicy } from "@/services/security-service";
import { showToast } from "@/utils/toast";
import { PrimaryButton, FormField } from "@/components/shared";

const SecurityPolicy = (): ReactElement => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        setIsLoading(true);
        const response = await securityService.getPasswordPolicy();
        if (response.success) {
          setPolicy(response.data);
        }
      } catch (err: any) {
        showToast.error(err?.response?.data?.message || "Failed to load security policy");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPolicy();
  }, []);

  const handleToggle = (section: keyof PasswordPolicy, field: string) => {
    if (!policy) return;
    const sectionData = (policy[section] as any);
    setPolicy({
      ...policy,
      [section]: {
        ...sectionData,
        [field]: !sectionData[field]
      }
    });
  };

  const handleInputChange = (section: keyof PasswordPolicy, field: string, value: string) => {
    if (!policy) return;
    const numValue = parseInt(value) || 0;
    const sectionData = (policy[section] as any);
    setPolicy({
      ...policy,
      [section]: {
        ...sectionData,
        [field]: numValue
      }
    });
  };

  const handleSave = async () => {
    if (!policy) return;

    try {
      setIsSaving(true);
      const response = await securityService.updatePasswordPolicy({
        min_length: policy.complexity.min_length,
        require_uppercase: policy.complexity.require_uppercase,
        require_lowercase: policy.complexity.require_lowercase,
        require_numbers: policy.complexity.require_numbers,
        require_special_chars: policy.complexity.require_special_chars,
        password_expiry_days: policy.expiry.password_expiry_days,
        password_history_count: policy.history.password_history_count,
        max_failed_attempts: policy.lockout.max_failed_attempts,
        lockout_duration_minutes: policy.lockout.lockout_duration_minutes,
      });

      if (response.success) {
        showToast.success("Security policy updated successfully");
        setPolicy(response.data);
      }
    } catch (err: any) {
      showToast.error(err?.response?.data?.message || "Failed to update security policy");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout currentPage="Security Policy">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-[#112868] animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      currentPage="Security Policy"
      pageHeader={{
        title: "Tenant Security Policy",
        description: "Configure password complexity, expiry, and account protection rules.",
      }}
    >
      <div className="max-w-4xl space-y-6">
        {/* Password Complexity Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#112868]" />
            <h3 className="font-semibold text-slate-800 text-lg">Password Complexity</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Minimum Password Length"
                type="number"
                min={6}
                max={32}
                value={policy?.complexity.min_length || 8}
                onChange={(e) => handleInputChange("complexity", "min_length", e.target.value)}
                helperText="Minimum number of characters required for passwords."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <PolicyToggle
                label="Require Uppercase"
                description="At least one uppercase letter (A-Z)"
                enabled={!!policy?.complexity.require_uppercase}
                onToggle={() => handleToggle("complexity", "require_uppercase")}
              />
              <PolicyToggle
                label="Require Lowercase"
                description="At least one lowercase letter (a-z)"
                enabled={!!policy?.complexity.require_lowercase}
                onToggle={() => handleToggle("complexity", "require_lowercase")}
              />
              <PolicyToggle
                label="Require Numbers"
                description="At least one numeric digit (0-9)"
                enabled={!!policy?.complexity.require_numbers}
                onToggle={() => handleToggle("complexity", "require_numbers")}
              />
              <PolicyToggle
                label="Require Special Characters"
                description="At least one special character (!@#$%^&*)"
                enabled={!!policy?.complexity.require_special_chars}
                onToggle={() => handleToggle("complexity", "require_special_chars")}
              />
            </div>
          </div>
        </div>

        {/* Password Lifecycle Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#112868]" />
            <h3 className="font-semibold text-slate-800 text-lg">Password Lifecycle</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Password Expiry (Days)"
              type="number"
              min={0}
              max={365}
              value={policy?.expiry.password_expiry_days || 90}
              onChange={(e) => handleInputChange("expiry", "password_expiry_days", e.target.value)}
              helperText="Force password reset after these many days. Set to 0 to disable."
            />
            <FormField
              label="Password History"
              type="number"
              min={0}
              max={24}
              value={policy?.history.password_history_count || 5}
              onChange={(e) => handleInputChange("history", "password_history_count", e.target.value)}
              helperText="Number of previous passwords that cannot be reused."
            />
          </div>
        </div>

        {/* Account Protection Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <Lock className="w-5 h-5 text-[#112868]" />
            <h3 className="font-semibold text-slate-800 text-lg">Account Protection</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Max Login Attempts"
              type="number"
              min={1}
              max={20}
              value={policy?.lockout.max_failed_attempts || 5}
              onChange={(e) => handleInputChange("lockout", "max_failed_attempts", e.target.value)}
              helperText="Number of failed attempts before account is locked."
            />
            <FormField
              label="Lockout Duration (Minutes)"
              type="number"
              min={1}
              max={1440}
              value={policy?.lockout.lockout_duration_minutes || 30}
              onChange={(e) => handleInputChange("lockout", "lockout_duration_minutes", e.target.value)}
              helperText="Time to wait before account is automatically unlocked."
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-4 bg-slate-50/50 p-6 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <AlertCircle className="w-4 h-4" />
            <span>Changes will apply to all users upon their next password change.</span>
          </div>
          <PrimaryButton 
            onClick={handleSave} 
            disabled={isSaving}
            className="px-8 flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Saving..." : "Save Policy"}
          </PrimaryButton>
        </div>
      </div>
    </Layout>
  );
};

interface PolicyToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

const PolicyToggle = ({ label, description, enabled, onToggle }: PolicyToggleProps) => (
  <button
    type="button"
    onClick={onToggle}
    className={`flex items-start gap-4 p-4 rounded-lg border transition-all text-left group ${
      enabled 
        ? "bg-emerald-50/50 border-emerald-200 ring-1 ring-emerald-200" 
        : "bg-white border-slate-200 hover:border-slate-300"
    }`}
  >
    <div className={`mt-0.5 rounded-full p-1 transition-colors ${
      enabled ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
    }`}>
      <CheckCircle2 className="w-4 h-4" />
    </div>
    <div className="flex-1">
      <h4 className={`text-sm font-semibold transition-colors ${
        enabled ? "text-emerald-900" : "text-slate-800"
      }`}>
        {label}
      </h4>
      <p className="text-xs text-slate-500 mt-0.5">
        {description}
      </p>
    </div>
  </button>
);

export default SecurityPolicy;
