import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ReactElement } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux-hooks";
import { loginAsync, clearError } from "@/store/authSlice";
import { FormField } from "@/components/shared";
import { PrimaryButton } from "@/components/shared";
import type { LoginError } from "@/services/auth-service";
import { showToast } from "@/utils/toast";
import { useTenantTheme } from "@/hooks/useTenantTheme";
import { AuthLayout } from "@/components/layout/AuthLayout";

// Zod validation schema
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const TenantLogin = (): ReactElement => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated, roles } = useAppSelector(
    (state) => state.auth,
  );
  const { theme, logoUrl } = useAppSelector((state) => state.theme);

  // Fetch and apply tenant theme
  useTenantTheme();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const [generalError, setGeneralError] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Check if user is super_admin, redirect to super admin dashboard
      // Handle both array and JSON string formats
      let rolesArray: string[] = [];
      if (Array.isArray(roles)) {
        rolesArray = roles;
      } else if (typeof roles === "string") {
        try {
          rolesArray = JSON.parse(roles);
        } catch {
          rolesArray = [];
        }
      }
      if (rolesArray.includes("super_admin")) {
        navigate("/dashboard");
      } else {
        // Tenant admin - redirect to tenant landing page (workspace selector)
        navigate("/tenant/landing");
      }
    }
  }, [isAuthenticated, roles, navigate]);

  // Clear errors on component mount
  useEffect(() => {
    dispatch(clearError());
    setGeneralError("");
    clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    setGeneralError("");
    clearErrors();
    dispatch(clearError());

    try {
      sessionStorage.setItem("remember_me", rememberMe ? "true" : "false");
      const result = await dispatch(loginAsync(data)).unwrap();
      if (result) {
        // Check if password reset is required
        if (result.data.requirePasswordReset) {
          const { tempToken, resetReason } = result.data;
          showToast.info(
            "Password reset required",
            "For security reasons, please update your password.",
          );
          navigate(`/reset-password?token=${tempToken}&reason=${resetReason}`);
          return;
        }

        const message = result.message || "Login successful";
        showToast.success(message);

        // Check roles after login to redirect appropriately
        // Handle both array and JSON string formats
        const userRoles = result.data.roles || [];
        let rolesArray: string[] = [];
        if (Array.isArray(userRoles)) {
          rolesArray = userRoles;
        } else if (typeof userRoles === "string") {
          try {
            rolesArray = JSON.parse(userRoles);
          } catch {
            rolesArray = [];
          }
        }
        if (rolesArray.includes("super_admin")) {
          navigate("/dashboard");
        } else {
          navigate("/tenant/landing");
        }
      }
    } catch (error: any) {
      dispatch(clearError());
      const loginError = error as LoginError;

      if (loginError && typeof loginError === "object") {
        if ("details" in loginError && Array.isArray(loginError.details)) {
          loginError.details.forEach((detail) => {
            if (detail.path === "email" || detail.path === "password") {
              setError(detail.path as keyof LoginFormData, {
                type: "server",
                message: detail.message,
              });
            } else {
              setGeneralError(detail.message);
            }
          });
        } else if ("error" in loginError) {
          if (
            typeof loginError.error === "object" &&
            loginError.error !== null &&
            "message" in loginError.error
          ) {
            setGeneralError(loginError.error.message || "Login failed");
          } else if (typeof loginError.error === "string") {
            setGeneralError(loginError.error);
          } else {
            setGeneralError("Login failed. Please check your credentials.");
          }
        } else {
          setGeneralError("An unexpected error occurred. Please try again.");
        }
      } else if (error?.message) {
        setGeneralError(error.message);
      } else {
        setGeneralError(
          "Login failed. Please check your credentials and try again.",
        );
      }
    }
  };

  return (
    <AuthLayout
      portalType="tenant"
      primaryColor={theme?.primary_color || undefined}
      secondaryColor={theme?.secondary_color || undefined}
      logoUrl={logoUrl || undefined}
    >
      {/* Header */}
      <div className="flex flex-col items-start gap-2 w-full">
        {/* Heading */}
        <div className="flex flex-col items-start w-full">
          <h2 className="text-[20px] font-semibold text-[#0F1724] leading-none">
            Sign in to your tenant
          </h2>
        </div>

        {/* Description */}
        <div className="flex flex-col items-start self-stretch">
          <p className="w-full max-w-[503px] font-inter text-[12px] font-normal leading-normal text-[#6B7280]">
            Use your work email or configured SSO provider to access the admin
            portal.
          </p>
        </div>
      </div>

      {/* Login Card Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSubmit(onSubmit)(e);
        }}
        className="flex flex-col w-full p-5 border border-gray-300 rounded-lg bg-white"
        noValidate
      >
        {/* General Error Message */}
        {generalError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 font-medium">{generalError}</p>
          </div>
        )}
        {!generalError && error && !errors.email && !errors.password && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Email Field */}
        <FormField
          label="Email"
          type="email"
          placeholder="Enter your email"
          required
          error={errors.email?.message}
          className="h-11 px-4 border border-gray-300 rounded-md focus-visible:ring-blue-500 focus-visible:border-blue-500"
          {...register("email")}
        />

        {/* Password Field */}
        <FormField
          label="Password"
          type="password"
          placeholder="Enter your password"
          required
          error={errors.password?.message}
          className="h-11 px-4 border border-gray-300 rounded-md focus-visible:ring-blue-500 focus-visible:border-blue-500"
          {...register("password")}
        />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-[18px] h-[18px] rounded border-[#d1d5db] focus:ring-2"
              style={
                {
                  backgroundColor: theme?.primary_color || "#112868",
                  accentColor: theme?.primary_color || "#112868",
                } as any
              }
            />
            <label
              htmlFor="remember-me"
              className="text-sm font-normal text-[#0f1724] cursor-pointer"
            >
              Remember Me
            </label>
          </div>
          <a
            href="/tenant/forgot-password"
            onClick={(e) => {
              e.preventDefault();
              navigate("/tenant/forgot-password");
            }}
            className="text-[13px] font-medium underline"
            style={{ color: theme?.primary_color || "#112868" }}
          >
            Forgot Password?
          </a>
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <PrimaryButton
            type="submit"
            disabled={isLoading}
            className="w-full h-11 text-base font-semibold rounded-md shadow-sm"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </PrimaryButton>
        </div>

        {/* New to tenant */}
        {/* <div className="flex items-center justify-between h-8 pt-1">
          <p className="text-xs font-normal text-[#6b7280]">
            New to this tenant?
          </p>
          <a
            href="/tenant/request-access"
            onClick={(e) => {
              e.preventDefault();
              navigate("/tenant/request-access");
            }}
            className="text-[13px] font-medium underline"
            style={{ color: theme?.secondary_color || "#23dce1" }}
          >
            Request Access
          </a>
        </div> */}

        {/* SSO Section */}
        {/* <div className="pt-1">
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-normal text-[#6b7280] uppercase tracking-[0.48px]">
              Single sign-on
            </p>
            <div className="grid grid-cols-3 gap-2">
              {["Google", "Microsoft", "Okta"].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  className="bg-white border border-[#9ca3af] rounded px-4 py-1 flex items-center justify-center gap-2 h-10 text-sm font-medium text-[#0f1724] hover:bg-[#f5f7fa] transition-colors"
                >
                  {provider}
                </button>
              ))}
            </div>
          </div>
        </div> */}
      </form>
    </AuthLayout>
  );
};

export default TenantLogin;
