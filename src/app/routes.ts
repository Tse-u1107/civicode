export type AppRoute = {
  name: string;
  icon: string;
  link: string;
};

export const appRoutes: AppRoute[] = [
  {
    name: "Home",
    icon: "Home",
    link: "/",
  },
  {
    name: "Chat",
    icon: "Chat",
    link: "/chat",
  },
  {
    name: "Retrieve",
    icon: "Flask",
    link: "/retrieve",
  },
  {
    name: "Saved",
    icon: "Flask",
    link: "/chat/saved",
  },
  {
    name: "Settings",
    icon: "Settings",
    link: "/settings",
  },
];
