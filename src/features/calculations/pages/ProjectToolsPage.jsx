import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Lightbulb,
  Shield,
  Monitor,
  Layers,
  ChevronRight,
  AlertCircle,
  X,
} from "lucide-react";

const PROJECT_TOOLS_TYPES = [
  {
    id: "lighting-project",
    title: "Lighting Project",
    icon: Lightbulb,
    description:
      "Calculate structural integrity and wind load for street and area lighting pole installations.",
    isInDevelopment: false,
    hidden: false,
  },
  {
    id: "signboard-project",
    title: "Signboard Project",
    icon: Monitor,
    description:
      "Analyze structural requirements for standalone and wall-mounted advertisement signboards.",
    isInDevelopment: true,
    hidden: true,
  },
  {
    id: "disaster-prevention-project",
    title: "Disaster Prevention Project",
    icon: Shield,
    description:
      "Evaluate safety factors and load capacities for emergency alert and disaster warning systems.",
    isInDevelopment: true,
    hidden: true,
  },
  {
    id: "multi-purpose-project",
    title: "Multi-purpose Project",
    icon: Layers,
    description:
      "Comprehensive analysis for structures supporting various multi-purpose load attachments.",
    isInDevelopment: true,
    hidden: true,
  },
];

export default function ProjectToolsPage() {
  const navigate = useNavigate();
  const [inDevModal, setInDevModal] = useState(null);

  const visibleProjects = PROJECT_TOOLS_TYPES.filter(
    (project) => !project.hidden
  );

  const handleSelectProject = (project) => {
    if (project.isInDevelopment) {
      setInDevModal(project);
      return;
    }
    navigate(`/project-tools/${project.id}/setup`);
  };

  return (
    <div className="min-h-full flex flex-col">
      <Helmet>
        <title>Project Tools · KORI BALI</title>
      </Helmet>

      <div className="mx-auto w-full max-w-[1600px] px-6 hp:px-3 lg:px-4 2xl:px-8 pt-0 pb-8">
        {/* Page header */}
        <div className="w-full max-w-[1400px] mx-auto text-left mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Project Tools
          </h1>
          <p className="text-gray-500 mt-1.5 text-sm">
            Choose the specific project module to begin structural calculation and technical drawing configuration.
          </p>
        </div>

        {/* Project type cards */}
        <div
          className={`grid gap-4 sm:gap-6 w-full max-w-[1400px] mx-auto ${
            visibleProjects.length > 1
              ? "grid-cols-1 xl:grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {visibleProjects.map((project) => {
            const Icon = project.icon;

            return (
              <div key={project.id} className="h-full">
                <button
                  type="button"
                  onClick={() => handleSelectProject(project)}
                  className="h-full group relative w-full text-left bg-white border border-gray-300 p-5 md:p-6 rounded hover:border-gray-500 transition-colors flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-5 cursor-pointer"
                >
                  {/* Icon Container */}
                  <div className="flex-shrink-0 p-3.5 bg-gray-100 text-gray-700 rounded border border-gray-200">
                    <Icon className="w-6 h-6 stroke-[1.5]" />
                  </div>

                  {/* Text Content */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900">
                        {project.title}
                      </h3>
                      {project.isInDevelopment && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-300">
                          In Development
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed pr-4">
                      {project.description}
                    </p>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="flex-shrink-0 self-center hidden sm:flex items-center justify-center w-8 h-8 rounded border border-gray-200 text-gray-400 group-hover:text-gray-700 group-hover:border-gray-400">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notice modal for in-development project modules */}
      {inDevModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded max-w-md w-full p-6 border border-gray-300">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded bg-gray-100 text-gray-700 flex items-center justify-center border border-gray-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setInDevModal(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-base font-bold text-gray-900">
                {inDevModal.title}
              </h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                The <strong>{inDevModal.title}</strong> module is currently in development.
              </p>
              <div className="mt-3.5 p-3.5 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 leading-relaxed">
                💡 For the current prototype, please proceed with <strong>Lighting Project</strong> which has full calculation and drawing capabilities ready.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setInDevModal(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded border border-gray-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setInDevModal(null);
                  navigate("/project-tools/lighting-project/setup");
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded border border-gray-900"
              >
                Open Lighting Project Setup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
