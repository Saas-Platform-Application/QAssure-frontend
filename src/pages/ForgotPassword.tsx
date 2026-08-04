import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ReactElement } from "react";
import { ArrowLeft } from "lucide-react";
import { authService } from "@/services/auth-service";
import { FormField } from "@/components/shared";
import { PrimaryButton } from "@/components/shared";
import { useAppSelector } from "@/hooks/redux-hooks";
import { useTenantTheme } from "@/hooks/useTenantTheme";
import { AuthLayout } from "@/components/layout/AuthLayout";

// Zod validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = (): ReactElement => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const { theme, logoUrl } = useAppSelector((state) => state.theme);

  // Fetch and apply tenant theme if on tenant route
  useTenantTheme();

  const isTenantRoute = location.pathname.startsWith("/tenant");
  const portalType = isTenantRoute ? "tenant" : "admin";
  const loginPath = isTenantRoute ? "/tenant/login" : "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
    clearErrors,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ForgotPasswordFormData): Promise<void> => {
    setError("");
    setSuccess("");
    clearErrors();
    setIsLoading(true);

    try {
      const response = await authService.forgotPassword({ email: data.email });
      if (response.success && response.data) {
        setSuccess(
          response.data.message ||
            "If an account exists with this email, a password reset link has been sent.",
        );
      }
    } catch (err: any) {
      console.error("Forgot password error:", err);
      if (err?.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else if (err?.response?.data?.error) {
        setError(
          typeof err.response.data.error === "string"
            ? err.response.data.error
            : "Failed to send reset email",
        );
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      portalType={portalType}
      primaryColor={theme?.primary_color || undefined}
      secondaryColor={theme?.secondary_color || undefined}
      logoUrl={logoUrl || undefined}
    >
      {/* Header */}
      <div className="flex flex-col items-start gap-2 w-full">
        {/* Heading */}
        <div className="flex flex-col items-start w-full">
          <h2 className="text-[20px] font-semibold text-[#0F1724] leading-none">
            Forgot Password
          </h2>
        </div>

        {/* Description */}
        <div className="flex flex-col items-start self-stretch">
          <p className="w-full max-w-[503px] font-inter text-[12px] font-normal leading-normal text-[#6B7280]">
            Enter your email address and we'll send you a link to reset your
            password
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="w-full p-3 bg-[rgba(16,185,129,0.1)] border border-[#10b981] rounded-md">
          <p className="text-sm text-[#10b981] font-medium">{success}</p>
        </div>
      )}

      {!success ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit(onSubmit)(e);
          }}
          className="flex flex-col w-full p-5 border border-gray-300 rounded-lg bg-white space-y-4"
          noValidate
        >
          {/* Error Message */}
          {error && (
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

          {/* Submit Button */}
          <div className="pt-2">
            <PrimaryButton
              type="submit"
              disabled={isLoading}
              className="w-full h-11 text-base font-semibold rounded-md shadow-sm"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </PrimaryButton>
          </div>
        </form>
      ) : (
        <div className="w-full space-y-4">
          <div className="pt-2">
            <PrimaryButton
              type="button"
              onClick={() => navigate(loginPath)}
              className="w-full h-11 text-base font-semibold rounded-md shadow-sm"
            >
              Back to Login
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Back to Login Link */}
      {!success && (
        <div className="mt-6 text-center w-full flex justify-center">
          <Link
            to={loginPath}
            className="inline-flex items-center gap-2 text-sm text-[#112868] hover:text-[#0d1f4d] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
