import type { ReactElement, ReactNode } from "react";
import { Shield } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  portalType?: "admin" | "tenant";
  primaryColor?: string;
  logoUrl?: string;
  secondaryColor?: string;
}

const adminStats = [
  {
    title: "Tenants Managed",
    value: "50+",
  },
  {
    title: "Regions supported",
    value: "12+",
  },
  {
    title: "System Uptime",
    value: "99.9%",
  },
  {
    title: "Active Users",
    value: "1200+",
  },
];

const tenantStats = [
  {
    title: "Avg. Response time",
    value: "< 2min",
  },
  {
    title: "Regions supported",
    value: "12+",
  },
  {
    title: "Monthly Logins",
    value: "1240+",
  },
  {
    title: "Compliance checks",
    value: "24/7",
  },
];

export const AuthLayout = ({
  children,
  portalType = "admin",
  primaryColor,
  logoUrl,
  secondaryColor,
}: AuthLayoutProps): ReactElement => {
  const stats = portalType === "admin" ? adminStats : tenantStats;
  const isTenant = portalType === "tenant";

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-[#F9F9F9]">
      {/* Left Section */}
      <div
        className="hidden lg:flex lg:w-1/2 h-full px-8 pt-8 pb-10 flex-col justify-between items-start"
        style={{ backgroundColor: primaryColor || "#112868" }}
      >
        <div className="w-full flex flex-col items-start gap-[10px] pt-8 pb-8">
          <div className="flex flex-col items-start w-full gap-[10px]">
            {/* Content Block */}
            <div className="flex flex-col items-start gap-3 max-w-[280px]">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-9 w-auto max-w-[180px] object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget
                        .nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}

                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                  style={{
                    display: logoUrl ? "none" : "flex",
                    backgroundColor: secondaryColor || "#00d2c4",
                  }}
                >
                  <Shield className="w-5 h-5 text-white" strokeWidth={2} />
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="text-[18px] font-semibold tracking-tight"
                    style={{ color: secondaryColor || "#00d2c4" }}
                  >
                    QAssure
                  </span>
                  <span className="text-white text-[13px] font-medium tracking-wider uppercase">
                    - {portalType}
                  </span>
                </div>
              </div>

              <h1 className="w-[373px] self-stretch text-white text-[24px] font-semibold leading-normal">
                {isTenant
                  ? "Secure access for every tenant."
                  : "Secure control across all products"}
              </h1>

              <p className="w-[373px] text-white text-[14px] font-medium leading-[21px]">
                {isTenant
                  ? "Log in to manage projects, approvals, documents, and more from a single, compliant control center."
                  : "QAssure unifies multiple products into a single platform. The admin console enables centralized management of users, tenants, configurations, and operations."}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="inline-grid grid-cols-2 gap-x-[10px] gap-y-[10px]">
              {stats.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col items-start w-[183.59px] p-3 gap-1 rounded-[6px] border border-white backdrop-blur-[20px]"
                  style={{
                    background:
                      "linear-gradient(96deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.30) 100.2%)",
                  }}
                >
                  <p className="text-white text-xs font-medium opacity-90">
                    {item.title}
                  </p>

                  <p className="text-white text-xl font-semibold">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-start self-stretch">
          <p className="text-white text-sm leading-[21px]">
            {isTenant
              ? "SSO, MFA, and audit-ready access for every tenant."
              : "Centralized control with secure access for all admin operations."}
          </p>

          <p className="text-white text-sm leading-[21px]">
            Need help? Contact your workspace administrator.
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="w-full lg:w-1/2 min-h-screen lg:h-full p-4 sm:p-8 lg:p-16 flex flex-col justify-center items-center">
        <div className="w-full max-w-[507px] bg-white p-5 sm:p-7 flex flex-col items-start gap-5">
          <div className="flex justify-between items-center w-full">
            <span className="flex flex-col items-start rounded-full bg-[#EDF3FE] px-[10px] py-1 text-xs font-medium text-[#2563EB] text-[11px]">
              {isTenant ? "Tenant Admin Portal" : "Admin Portal"}
            </span>
          </div>

          {children}

          {/* Footer Links */}
          <div className="flex items-start gap-4 w-full mt-auto">
            <button
              type="button"
              className="text-xs font-normal text-[#6B7280] hover:text-[#374151]"
            >
              Status page
            </button>

            <button
              type="button"
              className="text-xs font-normal text-[#6B7280] hover:text-[#374151]"
            >
              Security
            </button>

            <button
              type="button"
              className="text-xs font-normal text-[#6B7280] hover:text-[#374151]"
            >
              Help
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
