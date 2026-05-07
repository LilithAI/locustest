import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "Locus — Merit-Based Legal Internships in India" },
      {
        name: "description",
        content:
          "India's legal internship platform that connects law students with firms based on merit, not college name. Your merit. Your internship.",
      },
    ],
    links: [
      { rel: "icon", type: "image/x-icon", href: "/favicon-32.png?v=2" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "stylesheet", href: "/src/index.css" },
    ],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
  notFoundComponent: () => <Outlet />,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div id="root">{children}</div>
        <Scripts />
      </body>
    </html>
  );
}
