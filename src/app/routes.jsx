// src/app/routes.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// Shared / Layout
import Layout from "../shared/components/layout/Layout";
import ProtectedRoute from "../routes/ProtectedRoute";
import ScrollToTop from "../shared/components/ScroolTop";

// Flow Pages
import LoginPage from "../pages/LoginPage";
import ProjectToolsPage from "../features/calculations/pages/ProjectToolsPage";
import StructuralPage from "../features/calculations/pages/StructuralPage";
import OpeningFormPage from "../features/calculations/pages/steps/OpeningStep";
import BaseplateFormPage from "../features/calculations/pages/steps/BaseplateStep";
import FoundationFormPage from "../features/calculations/pages/steps/FoundationStep";
import ReportPage from "../features/report/pages/ReportPage";

// Guards
import TypeGuard from "../features/calculations/guards/TypeGuard";
import SessionGuard from "../features/calculations/guards/SessionGuard";

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* PUBLIC */}
        <Route path="/login" element={<LoginPage />} />

        {/* PROTECTED AREA */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* Core Project Tools Flow */}
            <Route path="project-tools">
              <Route index element={<ProjectToolsPage />} />
              <Route path="structural" element={<StructuralPage />} />
              <Route path="opening" element={<OpeningFormPage />} />
              <Route path="baseplate" element={<BaseplateFormPage />} />
              <Route path="foundation" element={<FoundationFormPage />} />
              <Route path="report" element={<ReportPage />} />

              <Route path=":type" element={<TypeGuard />}>
                <Route index element={<Navigate to="structural" replace />} />
                <Route path="setup" element={<Navigate to="/project-tools" replace />} />
                <Route path="structural" element={<StructuralPage />} />
                <Route element={<SessionGuard />}>
                  <Route path="initial" element={<Navigate to="/project-tools/structural" replace />} />
                  <Route path="pole" element={<StructuralPage />} />
                  <Route path="opening" element={<OpeningFormPage />} />
                  <Route path="baseplate" element={<BaseplateFormPage />} />
                  <Route path="foundation" element={<FoundationFormPage />} />
                  <Route path="report" element={<ReportPage />} />
                </Route>
              </Route>
            </Route>

            {/* Global Redirects */}
            <Route path="/" element={<Navigate to="/project-tools" replace />} />
            <Route path="*" element={<Navigate to="/project-tools" replace />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
