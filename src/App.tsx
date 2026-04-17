import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import Gallery from "@/pages/Gallery";
import Uncovered from "@/pages/Uncovered";
import CurateTogether from "@/pages/CurateTogether";
import Journal from "@/pages/Journal";
import LaceArchive from "@/pages/LaceArchive";
import Katelyn from "@/pages/Katelyn";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/lace-archive" element={<LaceArchive />} />
          <Route path="/uncovered" element={<Uncovered />} />
          <Route path="/curate" element={<CurateTogether />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/katelyn" element={<Katelyn />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
