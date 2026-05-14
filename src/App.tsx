import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReportBugButton } from "@/components/dashboard/ReportBugButton";
import { KeyboardShortcutsHelp } from "@/components/dashboard/KeyboardShortcutsHelp";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { useGlobalKeyboard } from "@/hooks/useGlobalKeyboard";
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

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Focus search input on current page
  const focusSearchInput = () => {
    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.focus();
    }
  };

  // Context-aware new item
  const handleNewItem = () => {
    if (location.pathname === "/" || location.pathname.startsWith("/?view=")) {
      // On dashboard, trigger new project dialog
      const newProjectButton = document.querySelector('[aria-label*="New Project"]') as HTMLButtonElement | null;
      if (newProjectButton) {
        newProjectButton.click();
      }
    } else if (location.pathname.startsWith("/subs")) {
      // On subcontractors page, trigger new subcontractor dialog
      const newSubButton = document.querySelector('button:has([class*="Plus"])') as HTMLButtonElement | null;
      if (newSubButton) {
        newSubButton.click();
      }
    }
  };

  // Context-aware edit
  const handleEdit = () => {
    if (location.pathname.startsWith("/project/")) {
      // On project detail, trigger edit dialog
      const editButton = document.querySelector('button:has([class*="Pencil"])') as HTMLButtonElement | null;
      if (editButton) {
        editButton.click();
      }
    }
  };

  // Global keyboard shortcuts
  useGlobalKeyboard([
    {
      key: "/",
      ctrlKey: true,
      metaKey: true,
      callback: focusSearchInput,
      description: "Focus search input",
    },
    {
      key: "?",
      callback: () => setHelpOpen(true),
      description: "Show keyboard shortcuts help",
    },
    {
      key: "k",
      ctrlKey: true,
      metaKey: true,
      callback: () => setCommandPaletteOpen(true),
      description: "Open command palette",
    },
    {
      key: "n",
      callback: handleNewItem,
      description: "New item (context-aware)",
    },
    {
      key: "e",
      callback: handleEdit,
      description: "Edit (context-aware)",
    },
  ], [
    {
      sequence: ["g", "p"],
      callback: () => navigate("/"),
      description: "Go to projects",
    },
    {
      sequence: ["g", "c"],
      callback: () => navigate("/?view=clients"),
      description: "Go to clients",
    },
    {
      sequence: ["g", "s"],
      callback: () => navigate("/subs"),
      description: "Go to subcontractors",
    },
    {
      sequence: ["g", "a"],
      callback: () => navigate("/activity"),
      description: "Go to activity log",
    },
  ]);

  return (
    <>
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
      <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
