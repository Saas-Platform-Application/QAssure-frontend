import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ReactElement } from "react";
import { authService } from "@/services/auth-service";
import { FormField } from "@/components/shared";
import { PrimaryButton } from "@/components/shared";
import { showToast } from "@/utils/toast";
import { AuthLayout } from "@/components/layout/AuthLayout";

// Zod validation schema - token is optional if provided in URL
const createResetPasswordSchema = (hasTokenFromUrl: boolean) =>
  z
    .object({
      token: hasTokenFromUrl
        ? z.string().optional()
        : z.string().min(1, "Reset token is required"),
      password: z
        .string()
        .min(1, "Password is required")
        .min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string().min(1, "Please confirm your password"),
      acceptTerms: z.boolean().refine((val) => val === true, {
        message: "You must accept the Terms of Service and Privacy Policy",
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });

const ResetPassword = (): ReactElement => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>("");

  const isTenantRoute = location.pathname.startsWith("/tenant");
  const portalType = isTenantRoute ? "tenant" : "admin";

  const tokenFromUrl = searchParams.get("token") || "";
  const reason = searchParams.get("reason") || "";
  const hasTokenFromUrl = Boolean(tokenFromUrl);

  const resetPasswordSchema = createResetPasswordSchema(hasTokenFromUrl);
  type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
    clearErrors,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: {
      token: tokenFromUrl || undefined,
      password: "",
      confirmPassword: "",
      acceptTerms: false as any,
    },
  });

  // Set token from URL if available
  useEffect(() => {
    if (tokenFromUrl) {
      setValue("token", tokenFromUrl);
    }
  }, [tokenFromUrl, setValue]);

  const onSubmit = async (data: ResetPasswordFormData): Promise<void> => {
    setSuccess("");
    clearErrors();
    setIsLoading(true);

    try {
      // Always use token from URL if available, otherwise use form data
      const tokenToUse = tokenFromUrl || data.token || "";
      const response = await authService.resetPassword({
        token: tokenToUse,
        password: data.password,
      });
      if (response.success) {
        const message =
          response.message ||
          response.data?.message ||
          "Password reset successfully!";
        const description =
          response.message || response.data?.message
            ? undefined
            : "You can now login with your new password";
        const successMessage =
          response.message ||
          response.data?.message ||
          "Password reset successfully! You can now login with your new password.";
        setSuccess(successMessage);
        showToast.success(message, description);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    } catch (err: any) {
      console.error("Reset password error:", err);
      // Handle validation errors from API
      if (
        err?.response?.data?.details &&
        Array.isArray(err.response.data.details)
      ) {
        const validationErrors = err.response.data.details;
        validationErrors.forEach(
          (detail: { path: string; message: string }) => {
            if (detail.path === "token" || detail.path === "password") {
              setError(detail.path as keyof ResetPasswordFormData, {
                type: "server",
                message: detail.message,
              });
            }
          },
        );
      } else {
        // Handle general errors
        const errorMessage =
          err?.response?.data?.error?.message ||
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to reset password. Please try again.";
        setError("root", {
          type: "server",
          message:
            typeof errorMessage === "string"
              ? errorMessage
              : "Failed to reset password. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout portalType={portalType}>
      {/* Header */}
      <div className="flex flex-col items-start gap-2 w-full">
        {/* Heading */}
        <div className="flex flex-col items-start w-full">
          <h2 className="text-[20px] font-semibold text-[#0F1724] leading-none">
            {reason === "FIRST_LOGIN"
              ? "Set Initial Password"
              : reason === "EXPIRED"
                ? "Update Expired Password"
                : "Set New Password"}
          </h2>
        </div>

        {/* Description */}
        <div className="flex flex-col items-start self-stretch">
          <p className="w-full max-w-[503px] font-inter text-[12px] font-normal leading-normal text-[#6B7280]">
            {reason === "FIRST_LOGIN"
              ? "Welcome to QAssure! Please set a new password for your account to continue."
              : reason === "EXPIRED"
                ? "Your password has expired. For security, please choose a new password."
                : "Create a strong password to activate your account and access the portal"}
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
          {/* General Error Display */}
          {errors.root && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 font-medium">
                {errors.root.message}
              </p>
            </div>
          )}

          {/* Token Field - Only show if not in URL */}
          {!hasTokenFromUrl && (
            <FormField
              label="Reset Token"
              type="text"
              placeholder="Enter reset token from email"
              required
              error={errors.token?.message}
              className="h-11 px-4 border border-gray-300 rounded-md focus-visible:ring-blue-500 focus-visible:border-blue-500"
              {...register("token")}
            />
          )}

          {/* Password Field */}
          <FormField
            label="New Password"
            type="password"
            placeholder="Create a strong password"
            required
            helperText="Min 8 characters with letters, numbers, and a symbol."
            error={errors.password?.message}
            className="h-11 px-4 border border-gray-300 rounded-md focus-visible:ring-blue-500 focus-visible:border-blue-500"
            {...register("password")}
          />

          {/* Confirm Password Field */}
          <FormField
            label="Confirm Password"
            type="password"
            placeholder="Re-enter your password"
            required
            helperText="Must match the new password exactly."
            error={errors.confirmPassword?.message}
            className="h-11 px-4 border border-gray-300 rounded-md focus-visible:ring-blue-500 focus-visible:border-blue-500"
            {...register("confirmPassword")}
          />

          {/* Accept Terms Checkbox */}
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-[#112868] focus:ring-[#112868]/20"
                {...register("acceptTerms")}
              />
              I accept the Terms of Service and Privacy Policy
            </label>
            {errors.acceptTerms ? (
              <span className="text-[11px] text-red-600">
                {errors.acceptTerms.message}
              </span>
            ) : (
              <span className="text-[11px] text-[#6B7280]">
                You must accept to continue.
              </span>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <PrimaryButton
              type="submit"
              disabled={isLoading}
              className="w-full h-11 text-base font-semibold rounded-md shadow-sm"
            >
              {isLoading ? "Resetting..." : "Login"}
            </PrimaryButton>
            <p className="text-xs text-[#6B7280] text-center mt-2">
              You will be redirected to the Tenant Admin Portal after saving.
            </p>
          </div>
        </form>
      ) : (
        <div className="w-full space-y-4">
          <div className="pt-2">
            <PrimaryButton
              type="button"
              onClick={() => navigate("/")}
              className="w-full h-11 text-base font-semibold rounded-md shadow-sm"
            >
              Go to Login
            </PrimaryButton>
          </div>
        </div>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
