import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AppRoutes } from "@/routes";
import { NotificationProvider } from "@/components/shared/NotificationProvider";

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <Toaster position="top-right" richColors />
        <AppRoutes />
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
