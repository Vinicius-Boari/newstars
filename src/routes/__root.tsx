import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SettingsProvider } from "@/lib/settings-context";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { redirect } from "@tanstack/react-router";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async () => {
    // Autenticação removida para acesso direto
  },

  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Controle de Comissões 2026" },
      {
        name: "description",
        content:
          "Sistema de controle de comissões com sincronização automática a partir do Google Sheets.",
      },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Controle de Comissões 2026" },
      {
        property: "og:description",
        content: "Dashboard de comissões com sync automático do Google Sheets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Controle de Comissões 2026" },
      { name: "description", content: "New Stars synchronizes and displays data from Google Sheets and OneDrive, allowing for viewing and editing." },
      { property: "og:description", content: "New Stars synchronizes and displays data from Google Sheets and OneDrive, allowing for viewing and editing." },
      { name: "twitter:description", content: "New Stars synchronizes and displays data from Google Sheets and OneDrive, allowing for viewing and editing." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a2da817c-a753-42bc-8e94-182785d1b618/id-preview-d1e60250--fddb9bb2-85a7-4d25-b747-bacdf99def15.lovable.app-1779797486422.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a2da817c-a753-42bc-8e94-182785d1b618/id-preview-d1e60250--fddb9bb2-85a7-4d25-b747-bacdf99def15.lovable.app-1779797486422.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouter().state.location.pathname;

  // Don't wrap in AppLayout if we are on the login page
  if (pathname === "/login") {
    return (
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <Outlet />
        </SettingsProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

