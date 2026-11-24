export const MENU_ITEMS = [
  {
    name: "Project Tools",
    icon: "PencilRuler",
    path: "/project-tools",
    roles: ["superadmin", "admin", "drafter", "drafter_checker", "admin_department"],
  },
];

// Shared spring animation config — used across sidebar and nav animations
export const SPRING_TRANSITION = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 1,
};
