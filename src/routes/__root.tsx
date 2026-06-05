import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

import appCss from "../styles.css?url";
import { SettingsProvider } from "@/lib/settings-context";
import { AppLayout } from "@/components/AppLayout";
import { useEffect } from "react";
import { syncPendingUpdates } from "@/lib/offline-sync";
import { updateSpreadsheetCell } from "@/lib/sheets";


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
    // Auth logic handled in individual routes
  },

  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Controle de Comissões NewStars" },
      {
        name: "description",
        content:
          "Sistema de controle de comissões com sincronização automática a partir do Google Sheets.",
      },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Controle de Comissões NewStars" },
      {
        property: "og:description",
        content: "Dashboard de comissões com sync automático do Google Sheets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Controle de Comissões NewStars" },
      { name: "description", content: "New Stars displays and allows editing of data from Google Sheets, synchronizing directly via a provided link." },
      { property: "og:description", content: "New Stars displays and allows editing of data from Google Sheets, synchronizing directly via a provided link." },
      { name: "twitter:description", content: "New Stars displays and allows editing of data from Google Sheets, synchronizing directly via a provided link." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a2da817c-a753-42bc-8e94-182785d1b618/id-preview-d1e60250--fddb9bb2-85a7-4d25-b747-bacdf99def15.lovable.app-1779797486422.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a2da817c-a753-42bc-8e94-182785d1b618/id-preview-d1e60250--fddb9bb2-85a7-4d25-b747-bacdf99def15.lovable.app-1779797486422.png" },
      { name: "theme-color", content: "#ffffff" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
    ],
    links: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/pwa-192x192.png" },
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
  const { pathname } = useRouterState({ select: (s) => s.location });

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    const handleOnline = () => {
      syncPendingUpdates(async (sheetId, range, value) => {
        await updateSpreadsheetCell({ data: { sheetId, range, value } });
      });
    };

    window.addEventListener("online", handleOnline);
    
    // Check for pending updates on mount if online
    if (navigator.onLine) {
      handleOnline();
    }

    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        {isLoginPage ? (
          <Outlet />
        ) : (
          <AppLayout>
            <Outlet />
          </AppLayout>
        )}
        <Toaster position="top-center" richColors />
      </SettingsProvider>
    </QueryClientProvider>
  );
}
