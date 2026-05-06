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
    name: "Test MCP API",
    icon: "Flask",
    link: "/test-mcp-api",
  },
];
