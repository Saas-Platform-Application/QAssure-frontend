import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux-hooks";
import { notificationService } from "@/services/notification-service";
import type {
  NotificationPreferences,
  NotificationCategory,
} from "@/types/notification";
import { setPreferences } from "@/store/notificationSlice";
import { showToast } from "@/utils/toast";
import { Save, Bell, Mail, Clock, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";

export const NotificationSettings = () => {
  const dispatch = useAppDispatch();
  const { preferences: storedPreferences } = useAppSelector(
    (state) => state.notifications,
  );
  const [preferences, setLocalPreferences] =
    useState<NotificationPreferences | null>(storedPreferences);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [prefRes, catRes] = await Promise.all([
          notificationService.getPreferences(),
          notificationService.getCategoriesForTenant(),
        ]);
        setLocalPreferences(prefRes.data);
        dispatch(setPreferences(prefRes.data));
        setCategories(catRes.data);
      } catch (error) {
        showToast.error("Failed to load notification settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dispatch]);

  const handleToggle = (field: keyof NotificationPreferences) => {
    if (!preferences) return;
    setLocalPreferences({
      ...preferences,
      [field]: !preferences[field],
    });
  };

  const handleCategoryToggle = (
    category: NotificationCategory,
    channel: "in_app" | "email",
  ) => {
    if (!preferences) return;
    const categoryPrefs = { ...preferences.category_preferences };
    categoryPrefs[category] = {
      ...categoryPrefs[category],
      [channel]: !categoryPrefs[category][channel],
    };
    setLocalPreferences({
      ...preferences,
      category_preferences: categoryPrefs,
    });
  };

  const handleSave = async () => {
    if (!preferences) return;
    setIsSaving(true);
    try {
      const response = await notificationService.updatePreferences(preferences);
      dispatch(setPreferences(response.data));
      showToast.success("Notification preferences updated successfully");
    } catch (error) {
      showToast.error("Failed to update preferences");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !preferences) {
    return (
      <Layout
        currentPage="Notification Settings"
        pageHeader={{
          title: "Notification Settings",
          description: "Control how and when you want to be notified",
        }}
      >
        <div className="p-8 text-center text-gray-500">
          Loading preferences...
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      currentPage="Notification Settings"
      pageHeader={{
        title: "Notification Settings",
        description: "Control how and when you want to be notified",
        action: (
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        ),
      }}
    >
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Master Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm bg-blue-50/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      In-App Notifications
                    </p>
                    <p className="text-xs text-gray-500">
                      Receive real-time alerts in the platform
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.in_app_enabled}
                    onChange={() => handleToggle("in_app_enabled")}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-green-50/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Email Notifications
                    </p>
                    <p className="text-xs text-gray-500">
                      Get updates delivered to your inbox
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.email_enabled}
                    onChange={() => handleToggle("email_enabled")}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Matrix */}
        <Card className="border-gray-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg">Category Preferences</CardTitle>
            <CardDescription>
              Select which business events you want to be notified about via
              each channel
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/30">
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-center">In-App</th>
                  <th className="px-6 py-4 text-center">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categories.map((cat: any) => (
                  <tr
                    key={cat.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 text-sm">
                        {cat.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cat.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={
                          preferences.category_preferences[
                            cat.code as NotificationCategory
                          ]?.in_app ?? true
                        }
                        onChange={() =>
                          handleCategoryToggle(
                            cat.code as NotificationCategory,
                            "in_app",
                          )
                        }
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        checked={
                          preferences.category_preferences[
                            cat.code as NotificationCategory
                          ]?.email ?? true
                        }
                        onChange={() =>
                          handleCategoryToggle(
                            cat.code as NotificationCategory,
                            "email",
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quiet Hours */}
          <Card className="border-gray-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <CardTitle className="text-lg">Quiet Hours</CardTitle>
              </div>
              <CardDescription>
                Suppress non-urgent notifications during specific times
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-900">
                  Enable Quiet Hours
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.quiet_hours_enabled}
                    onChange={() => handleToggle("quiet_hours_enabled")}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {preferences.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase">
                      Start Time
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-purple-400 transition-colors"
                      value={preferences.quiet_hours_start || ""}
                      onChange={(e) =>
                        setLocalPreferences({
                          ...preferences,
                          quiet_hours_start: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase">
                      End Time
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-purple-400 transition-colors"
                      value={preferences.quiet_hours_end || ""}
                      onChange={(e) =>
                        setLocalPreferences({
                          ...preferences,
                          quiet_hours_end: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 pt-2 text-[11px] text-gray-500 italic">
                <Info className="w-3.5 h-3.5 mt-0.5" />
                <span>
                  Urgent priority notifications bypass quiet hours and are
                  always delivered.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Email Frequency & Timezone */}
          <Card className="border-gray-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-lg">Email Frequency</CardTitle>
              </div>
              <CardDescription>
                How often you want to receive email updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {["instant", "daily", "weekly"].map((freq) => (
                  <label
                    key={freq}
                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="email_digest"
                      className="w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500"
                      checked={preferences.email_digest === freq}
                      onChange={() =>
                        setLocalPreferences({
                          ...preferences,
                          email_digest: freq as any,
                        })
                      }
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {freq}
                      </p>
                      <p className="text-xs text-gray-500">
                        {freq === "instant"
                          ? "Receive as soon as they happen"
                          : freq === "daily"
                            ? "One daily digest at 8:00 AM"
                            : "One weekly summary every Monday"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default NotificationSettings;
