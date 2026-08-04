import { useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PrimaryButton } from '@/components/shared';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = (): ReactElement => {
  const navigate = useNavigate();

  const handleGoHome = (): void => {
    navigate('/dashboard');
  };

  const handleGoBack = (): void => {
    navigate(-1);
  };

  return (
    <Layout currentPage="Page Not Found">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        {/* 404 Number */}
        <div className="mb-6">
          <h1 className="text-8xl md:text-9xl font-bold text-[#112868] leading-none">
            404
          </h1>
        </div>

        {/* Error Message */}
        <div className="mb-8 max-w-md">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0f1724] mb-3">
            Page Not Found
          </h2>
          <p className="text-sm md:text-base text-[#6b7280] leading-relaxed">
            The page you're looking for doesn't exist or has been moved. Please check the URL or
            navigate back to the dashboard.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto">
          <PrimaryButton
            onClick={handleGoHome}
            size="default"
            className="flex items-center justify-center gap-2 min-w-[160px]"
          >
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </PrimaryButton>
          <PrimaryButton
            onClick={handleGoBack}
            size="default"
            variant="default"
            className="flex items-center justify-center gap-2 min-w-[160px] bg-[#23dce1] text-[#112868] hover:bg-[#112868] hover:text-[#23dce1]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </PrimaryButton>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
