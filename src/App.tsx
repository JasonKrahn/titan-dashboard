import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReportBugButton } from "@/components/dashboard/ReportBugButton";
import Index from "./pages/Index.tsx";
import ProjectDetail from "./pages/ProjectDetail.tsx";
import PhaseDetail from "./pages/PhaseDetail.tsx";
import SubcontractorRolodex from "./pages/SubcontractorRolodex.tsx";
import ActivityLog from "./pages/ActivityLog.tsx";
import AdminCommandCenter from "./pages/AdminCommandCenter.tsx";
import OrganizationMembers from "./pages/OrganizationMembers.tsx";
import Archive from "./pages/Archive.tsx";
import InventoryTracker from "./pages/InventoryTracker.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/project/:projectId/phase/:phaseId" element={<PhaseDetail />} />
          <Route path="/subs" element={<SubcontractorRolodex />} />
          <Route path="/organization" element={<OrganizationMembers />} />
          <Route path="/activity" element={<ActivityLog />} />
          <Route path="/command" element={<AdminCommandCenter />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/inventory" element={<InventoryTracker />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ReportBugButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
