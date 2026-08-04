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

const Login = (): ReactElement => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated, roles, tenantId } = useAppSelector(
    (state) => state.auth,
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur", // Validate on blur for better UX
  });

  const [generalError, setGeneralError] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Check if user is super_admin or a platform user, redirect to super admin dashboard
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
      const isPlatformUser =
        rolesArray.includes("super_admin") ||
        tenantId === "00000000-0000-0000-0000-000000000001";
      if (isPlatformUser) {
        navigate("/dashboard");
      } else {
        // Tenant admin - redirect to tenant landing page (workspace selector)
        navigate("/tenant/landing");
      }
    }
  }, [isAuthenticated, roles, tenantId, navigate]);

  // Clear errors only on component mount, not on every auth state change
  useEffect(() => {
    dispatch(clearError());
    setGeneralError("");
    clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    // Clear previous errors
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
        const description = result.message ? undefined : "Welcome back!";
        showToast.success(message, description);

        // Check roles after login to redirect appropriately
        const userRoles = result.data.roles || [];
        const userTenantId = result.data.tenant_id;
        const isPlatformUser =
          userRoles.includes("super_admin") ||
          userTenantId === "00000000-0000-0000-0000-000000000001";
        if (isPlatformUser) {
          navigate("/dashboard");
        } else {
          navigate("/tenant/landing");
        }
      }
    } catch (error: any) {
      // Clear Redux error state since we're handling errors locally
      dispatch(clearError());

      const loginError = error as LoginError;

      if (loginError && typeof loginError === "object") {
        // Check for validation errors with details array
        if ("details" in loginError && Array.isArray(loginError.details)) {
          // Validation errors from server - set field-specific errors
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
    <AuthLayout portalType="admin">
      {/* Header */}
      <div className="flex flex-col items-start gap-2 w-full">
        {/* Heading */}
        <div className="flex flex-col items-start w-full">
          <h2 className="text-[20px] font-semibold text-[#0F1724] leading-none">
            Sign in
          </h2>
        </div>

        {/* Description */}
        <div className="flex flex-col items-start self-stretch">
          <p className="w-full max-w-[503px] font-inter text-[12px] font-normal leading-normal text-[#6B7280]">
            Use your work email or configured SSO provider to access the
            admin portal.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleSubmit(onSubmit)(e);
        }}
        className="flex flex-col w-full p-5 border border-gray-300 rounded-lg bg-white"
        noValidate
      >
        {/* General Error Message - Prioritize local error over Redux error */}
        {generalError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 font-medium">
              {generalError}
            </p>
          </div>
        )}

        {/* Show Redux error only if no local error and no field errors */}
        {!generalError && error && !errors.email && !errors.password && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Email */}
        <FormField
          label="Email"
          type="email"
          placeholder="user@company.com"
          required
          helperText="Enter your work email"
          error={errors.email?.message}
          className="h-11 px-4 border border-gray-300 rounded-md focus-visible:ring-blue-500 focus-visible:border-blue-500"
          {...register("email")}
        />

        {/* Password */}
        <FormField
          label="Password"
          type="password"
          placeholder="••••••••"
          required
          helperText="Enter your password (min 8 characters)"
          error={errors.password?.message}
          className="h-11 px-4 border border-gray-300 rounded-md focus-visible:ring-blue-500 focus-visible:border-blue-500"
          {...register("password")}
        />

        {/* Remember Me */}
        <div className="flex items-center justify-between mt-1">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-gray-300 text-[#112868] focus:ring-[#112868]/20"
            />
            Remember Me
          </label>

          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-sm font-medium text-[#112868] hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        {/* Login Button */}
        <div className="pt-1">
          <PrimaryButton
            type="submit"
            disabled={isLoading}
            className="w-full h-11 text-base font-semibold rounded-md shadow-sm"
          >
            {isLoading ? "Signing in..." : "Login"}
          </PrimaryButton>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;
