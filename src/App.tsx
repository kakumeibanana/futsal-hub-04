import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import SchedulePage from "./pages/SchedulePage";
import ScheduleAdjustPage from "./pages/ScheduleAdjustPage";
import NewsPage from "./pages/NewsPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import VideosPage from "./pages/VideosPage";
import GalleryPage from "./pages/GalleryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SiteHeader />
          <main className="min-h-screen">
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/news/:id" element={<NewsDetailPage />} />
              {/* Protected */}
              <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
              <Route path="/adjust" element={<ProtectedRoute><ScheduleAdjustPage /></ProtectedRoute>} />
              <Route path="/videos" element={<ProtectedRoute><VideosPage /></ProtectedRoute>} />
              <Route path="/gallery" element={<ProtectedRoute><GalleryPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <SiteFooter />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
