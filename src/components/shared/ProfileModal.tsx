import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Laptop,
  Smartphone,
  Globe,
  Clock,
  LogOut,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { useAppDispatch, useAppSelector } from '@/hooks/redux-hooks';
import { logoutAllAsync } from '@/store/authSlice';
import { authService, type SessionInfo } from '@/services/auth-service';
import { showToast } from '@/utils/toast';
import type { ReactElement } from 'react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'profile' | 'sessions';
}

export const ProfileModal = ({
  isOpen,
  onClose,
  defaultTab = 'sessions',
}: ProfileModalProps): ReactElement | null => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, roles, tenantId, tenant } = useAppSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState<'profile' | 'sessions'>(defaultTab);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState<boolean>(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      fetchActiveSessions();
    }
  }, [isOpen, defaultTab]);

  const getTenantDisplayName = (): string => {
    return tenant?.name || 'System';
  };

  const fetchActiveSessions = async (): Promise<void> => {
    setIsLoadingSessions(true);
    try {
      const response = await authService.getSessions();
      if (response.success && response.data) {
        setSessions(response.data.sessions || []);
        setCurrentSessionId(response.data.current_session_id || '');
      }
    } catch (error: any) {
      console.error('Failed to fetch active sessions:', error);
      showToast.error('Failed to load active sessions');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: string): Promise<void> => {
    setRevokingSessionId(sessionId);
    try {
      const response = await authService.revokeSession(sessionId);
      if (response.success !== false) {
        showToast.success('Session revoked.');
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } else {
        showToast.error(response.message || 'Failed to revoke session');
      }
    } catch (error: any) {
      console.error('Revoke session error:', error);
      showToast.error(error?.response?.data?.message || 'Failed to revoke session');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleLogoutAll = async (): Promise<void> => {
    setIsLoggingOutAll(true);
    const isPlatformUser =
      roles.includes('super_admin') || tenantId === '00000000-0000-0000-0000-000000000001';
    const isTenantRoute =
      window.location.pathname.startsWith('/tenant/') || window.location.pathname === '/tenant';
    const redirectPath = isPlatformUser ? '/' : isTenantRoute ? '/tenant/login' : '/';

    try {
      await dispatch(logoutAllAsync()).unwrap();
      showToast.success('Logged out from all sessions');
      onClose();
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      console.error('Logout all error:', error);
      dispatch({ type: 'auth/logout' });
      showToast.success('Logged out from all sessions');
      onClose();
      navigate(redirectPath, { replace: true });
    } finally {
      setIsLoggingOutAll(false);
      setShowLogoutAllConfirm(false);
    }
  };

  const parseDeviceType = (userAgent?: string) => {
    if (!userAgent) return { label: 'Web Browser', icon: Laptop };
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) {
      return { label: 'Mobile Device', icon: Smartphone };
    }
    if (ua.includes('windows')) {
      return { label: 'Windows PC', icon: Laptop };
    }
    if (ua.includes('macintosh') || ua.includes('mac os')) {
      return { label: 'Mac / macOS', icon: Laptop };
    }
    if (ua.includes('linux')) {
      return { label: 'Linux Workstation', icon: Laptop };
    }
    return { label: 'Web Browser', icon: Globe };
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Profile Settings & Sessions"
      description="Manage your account profile and active device sessions"
      maxWidth="lg"
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors -mb-px ${
            activeTab === 'profile'
              ? 'border-[#0f1724] text-[#0f1724]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile Details</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('sessions');
            fetchActiveSessions();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors -mb-px ${
            activeTab === 'sessions'
              ? 'border-[#0f1724] text-[#0f1724]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Active Sessions</span>
          {sessions.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
              {sessions.length}
            </span>
          )}
        </button>
      </div>

      {/* Profile Details View */}
      {activeTab === 'profile' && (
        <div className="space-y-6 py-2">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="w-14 h-14 rounded-full bg-[#0f1724] text-white flex items-center justify-center font-bold text-lg">
              {user?.first_name?.[0]}
              {user?.last_name?.[0]}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#0f1724]">
                {user?.first_name} {user?.last_name}
              </h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {roles.map((r) => (
                  <span
                    key={r}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg border border-gray-200 bg-white">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">
                First Name
              </label>
              <p className="text-sm font-medium text-[#0f1724]">{user?.first_name || 'N/A'}</p>
            </div>
            <div className="p-3.5 rounded-lg border border-gray-200 bg-white">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">
                Last Name
              </label>
              <p className="text-sm font-medium text-[#0f1724]">{user?.last_name || 'N/A'}</p>
            </div>
            <div className="p-3.5 rounded-lg border border-gray-200 bg-white">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">
                Email Address
              </label>
              <p className="text-sm font-medium text-[#0f1724]">{user?.email || 'N/A'}</p>
            </div>
            <div className="p-3.5 rounded-lg border border-gray-200 bg-white">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">
                Tenant Context
              </label>
              <p className="text-sm font-medium text-[#0f1724] truncate">{getTenantDisplayName()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions View */}
      {activeTab === 'sessions' && (
        <div className="space-y-4 py-2">
          {/* Active Sessions Header & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <h3 className="text-sm font-semibold text-[#0f1724]">Active Login Sessions</h3>
              <p className="text-xs text-gray-500">
                You are currently logged in on these devices. Revoke any unfamiliar session.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* <button
                type="button"
                onClick={fetchActiveSessions}
                disabled={isLoadingSessions}
                className="p-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Refresh sessions"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingSessions ? 'animate-spin' : ''}`} />
              </button> */}
              <button
                type="button"
                id="logout-all-devices-btn"
                onClick={() => setShowLogoutAllConfirm(true)}
                disabled={isLoggingOutAll}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 rounded-md transition-colors disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout All Devices</span>
              </button>
            </div>
          </div>

          {/* Confirm Logout All Dialog */}
          {showLogoutAllConfirm && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">Logout All Devices?</h4>
                  <p className="text-xs text-red-700 mt-0.5">
                    This will immediately invalidate all active login sessions across all browsers and devices. You will be redirected to the login page.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogoutAllConfirm(false)}
                  disabled={isLoggingOutAll}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogoutAll}
                  disabled={isLoggingOutAll}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoggingOutAll ? 'Logging out...' : 'Confirm Logout All Devices'}
                </button>
              </div>
            </div>
          )}

          {/* Sessions List */}
          {isLoadingSessions ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
              <span className="text-xs font-medium">Loading active sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              No active sessions found.
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {sessions.map((session) => {
                const { label: deviceLabel, icon: DeviceIcon } = parseDeviceType(session.user_agent);
                const isCurrent = session.id === currentSessionId;

                return (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                      isCurrent
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-lg ${isCurrent ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        <DeviceIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#0f1724] truncate">
                            {deviceLabel}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Current Device
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {session.ip_address || '127.0.0.1'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(session.created_at)}
                          </span>
                        </div>
                        {session.user_agent && (
                          <p className="text-[11px] text-gray-400 truncate max-w-md mt-0.5">
                            {session.user_agent}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingSessionId === session.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded transition-colors disabled:opacity-50 ml-2 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{revokingSessionId === session.id ? 'Revoking...' : 'Revoke'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
