// src/app/routes.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// Shared / Layout
import Layout from "../shared/components/layout/Layout";
import ProtectedRoute from "../routes/ProtectedRoute";
import ScrollToTop from "../shared/components/ScroolTop";

// Flow Pages
import LoginPage from "../pages/LoginPage";
import ProjectToolsPage from "../features/calculations/pages/ProjectToolsPage";
import ProjectToolsSetupPage from "../features/calculations/pages/ProjectToolsSetupPage";
import InitialInputPage from "../features/calculations/pages/InitialInputPage";
import PoleFormPage from "../features/calculations/pages/steps/PoleStep";
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
              <Route path=":type" element={<TypeGuard />}>
                <Route index element={<Navigate to="setup" replace />} />
                <Route path="setup" element={<ProjectToolsSetupPage />} />
                <Route element={<SessionGuard />}>
                  <Route path="initial" element={<InitialInputPage />} />
                  <Route path="pole" element={<PoleFormPage />} />
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
