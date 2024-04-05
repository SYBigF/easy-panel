import { type SideItem, type NavItem } from "types";

export const userNavConfig: NavItem[] = [
  // {
  //   title: "ChatGPT",
  //   href: "https://chat.openai.com/",
  //   icon: "openai",
  //   external: true,
  // },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "gauge",
  },
  {
    title: "Logs",
    href: "/dashboard/logs",
    icon: "fileClock",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: "settings",
  },
];

export const adminNavConfig: SideItem[] = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: "info",
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: "user",
    sub: [
      {
        title: "All Users",
        href: "/admin/users",
      },
      {
        title: "Add User",
        href: "/admin/users/add",
      },
    ],
  },
  {
    title: "Logs",
    icon: "fileClock",
    sub: [
      {
        title: "Resource Usage",
        href: "/admin/logs/resource",
      },
      {
        title: "Event Usage",
        href: "/admin/logs/events",
      },
    ],
  },
  {
    title: "Instances",
    icon: "server",
    sub: [
      {
        title: "All Instances",
        href: "/admin/instances",
      },
      {
        title: "Create Instance",
        href: "/admin/instances/create",
      },
    ],
  },
];

// const filterRole = (role: UserRole | null, item: { access?: UserRole }) => {
//   const roleRequired = item.access ?? UserRole.USER;
//   if (roleRequired == UserRole.ADMIN) {
//     return role == UserRole.ADMIN;
//   } else if (roleRequired == UserRole.USER) {
//     return role == UserRole.USER || role == UserRole.ADMIN;
//   } else {
//     return false;
//   }
// };

// export const getDashboardConfigForRole = (role: UserRole) => {
//   return {
//     mainNav: dashboardConfig.mainNav.filter((item) => filterRole(role, item)),
//     sidebarNav: dashboardConfig.userSidebarNav.filter((item) => filterRole(role, item)),
//   };
// };
