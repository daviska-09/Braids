import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Bookmark } from "lucide-react";
import Header from "@/components/Header";
import LandingOverlay from "@/components/LandingOverlay";
import Gallery from "@/pages/Gallery";
import Uncovered from "@/pages/Uncovered";
import CurateTogether from "@/pages/CurateTogether";
import Journal from "@/pages/Journal";
import LaceArchive from "@/pages/LaceArchive";
import Katelyn from "@/pages/Katelyn";
import About from "@/pages/About";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LandingOverlay />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Header />
        <Link
          to="/saved"
          className="fixed bottom-6 right-6 z-50 p-3 bg-background border border-border rounded-full shadow-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Saved collection"
        >
          <Bookmark size={18} />
        </Link>
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/lace-archive" element={<LaceArchive />} />
          <Route path="/explored" element={<Uncovered />} />
          <Route path="/uncovered" element={<Uncovered />} />
          <Route path="/saved" element={<CurateTogether />} />
          <Route path="/curate" element={<CurateTogether />} />
          <Route path="/field-notes" element={<Journal />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/katelyn" element={<Katelyn />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
