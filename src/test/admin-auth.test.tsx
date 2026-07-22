import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";

const supabaseTestDouble = vi.hoisted(() => {
  type AuthCallback = (event: string, session: Session | null) => void;
  const state: {
    session: Session | null;
    signInSession: Session | null;
    getSessionError: Error | null;
    getUserError: Error | null;
    callback: AuthCallback | null;
  } = {
    session: null,
    signInSession: null,
    getSessionError: null,
    getUserError: null,
    callback: null,
  };

  const auth = {
    getSession: vi.fn(async () => ({
      data: { session: state.session },
      error: state.getSessionError,
    })),
    getUser: vi.fn(async () => ({
      data: { user: state.getUserError ? null : state.session?.user ?? null },
      error: state.getUserError,
    })),
    onAuthStateChange: vi.fn((callback: AuthCallback) => {
      state.callback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signInWithPassword: vi.fn(async () => {
      state.session = state.signInSession;
      if (state.session) state.callback?.("SIGNED_IN", state.session);
      return state.session
        ? { data: { session: state.session, user: state.session.user }, error: null }
        : { data: { session: null, user: null }, error: new Error("invalid") };
    }),
    signOut: vi.fn(async () => {
      state.session = null;
      state.callback?.("SIGNED_OUT", null);
      return { error: null };
    }),
  };

  return {
    state,
    supabase: {
      auth,
      rpc: vi.fn(),
      from: vi.fn(),
      functions: { invoke: vi.fn() },
      storage: { from: vi.fn() },
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: supabaseTestDouble.supabase,
}));

vi.mock("@/components/AnalyticsDashboard", () => ({
  AnalyticsDashboard: () => <div>Admin analytics content</div>,
}));
vi.mock("@/components/StudentDashboard", () => ({
  StudentDashboard: () => <div>Student dashboard content</div>,
}));
vi.mock("@/components/EmployerDashboard", () => ({
  EmployerDashboard: () => <div>Employer dashboard content</div>,
}));
vi.mock("@/components/LandingPage", () => ({
  LandingPage: () => <div>RaiderMatch landing page</div>,
}));
vi.mock("@/components/AuthModal", () => ({
  AuthModal: () => null,
}));
vi.mock("@/components/Settings", () => ({
  Settings: () => <div>Account settings</div>,
}));

import { AppRoutes } from "@/App";

function createSession(
  role: "admin" | "employer" | "student",
  id = `${role}-user`,
): Session {
  const appRole = role === "student" ? undefined : role;
  return {
    access_token: `${role}-access-token`,
    refresh_token: `${role}-refresh-token`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: {
      id,
      aud: "authenticated",
      role: "authenticated",
      email: `${role}@example.com`,
      app_metadata: appRole ? { role: appRole } : {},
      user_metadata: { role },
      identities: [],
      created_at: new Date().toISOString(),
    },
  } as Session;
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderAt(
  entry: string | { pathname: string; state?: Record<string, unknown> },
) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  supabaseTestDouble.state.session = null;
  supabaseTestDouble.state.signInSession = null;
  supabaseTestDouble.state.getSessionError = null;
  supabaseTestDouble.state.getUserError = null;
  supabaseTestDouble.state.callback = null;
  vi.clearAllMocks();
});

describe("persistent admin authentication", () => {
  it("logs an admin in and sends them to the intended dashboard", async () => {
    supabaseTestDouble.state.signInSession = createSession("admin");
    const user = userEvent.setup();
    renderAt({
      pathname: "/admin/login",
      state: { from: "/admin/dashboard" },
    });

    await screen.findByRole("heading", { name: "RaiderMatch Admin" });
    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in to admin" }));

    expect(await screen.findByText("Admin analytics content")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/dashboard");
  });

  it("keeps an admin authenticated when the dashboard refreshes", async () => {
    supabaseTestDouble.state.session = createSession("admin");
    renderAt("/admin/dashboard");

    expect(await screen.findByText("Admin analytics content")).toBeInTheDocument();
    expect(supabaseTestDouble.supabase.auth.getSession).toHaveBeenCalled();
    expect(supabaseTestDouble.supabase.auth.getUser).toHaveBeenCalled();
  });

  it("restores the persisted admin session after the application remounts", async () => {
    supabaseTestDouble.state.session = createSession("admin");
    const firstMount = renderAt("/admin/dashboard");
    expect(await screen.findByText("Admin analytics content")).toBeInTheDocument();
    firstMount.unmount();

    renderAt("/admin/dashboard");
    expect(await screen.findByText("Admin analytics content")).toBeInTheDocument();
    expect(supabaseTestDouble.supabase.auth.getSession).toHaveBeenCalledTimes(2);
  });

  it("redirects an unauthenticated admin URL to admin login", async () => {
    renderAt("/admin/dashboard");

    expect(await screen.findByRole("heading", { name: "RaiderMatch Admin" }))
      .toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/login");
  });

  it("blocks an authenticated non-admin from admin routes", async () => {
    supabaseTestDouble.state.session = createSession("student");
    renderAt("/admin/dashboard");

    expect(await screen.findByText("Admin access required")).toBeInTheDocument();
    expect(screen.queryByText("Admin analytics content")).not.toBeInTheDocument();
  });

  it("redirects an authenticated admin away from admin login", async () => {
    supabaseTestDouble.state.session = createSession("admin");
    renderAt("/admin/login");

    expect(await screen.findByText("Admin analytics content")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/dashboard");
  });

  it("logs out and prevents the restored route from opening again", async () => {
    supabaseTestDouble.state.session = createSession("admin");
    const user = userEvent.setup();
    const dashboard = renderAt("/admin/dashboard");
    await user.click(await screen.findByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/admin/login");
    });
    expect(supabaseTestDouble.supabase.auth.signOut).toHaveBeenCalledWith();
    dashboard.unmount();

    renderAt("/admin/dashboard");
    expect(await screen.findByRole("heading", { name: "RaiderMatch Admin" }))
      .toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/login");
  });

  it("clears an invalid restored session and shows a safe error", async () => {
    supabaseTestDouble.state.session = createSession("admin");
    supabaseTestDouble.state.getUserError = new Error("refresh token rejected");
    renderAt("/admin/dashboard");

    expect(await screen.findByText(/session expired or could not be restored/i))
      .toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/login");
    expect(supabaseTestDouble.supabase.auth.signOut).toHaveBeenCalledWith({
      scope: "local",
    });
  });

  it("does not let a delayed verification resurrect a signed-out admin", async () => {
    const adminSession = createSession("admin");
    supabaseTestDouble.state.session = adminSession;
    let resolveVerification: ((value: {
      data: { user: Session["user"] };
      error: null;
    }) => void) | undefined;
    supabaseTestDouble.supabase.auth.getUser.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveVerification = resolve;
      }),
    );

    renderAt("/admin/dashboard");
    await waitFor(() => {
      expect(supabaseTestDouble.supabase.auth.getUser).toHaveBeenCalled();
    });

    await act(async () => {
      supabaseTestDouble.state.session = null;
      supabaseTestDouble.state.callback?.("SIGNED_OUT", null);
    });
    expect(await screen.findByRole("heading", { name: "RaiderMatch Admin" }))
      .toBeInTheDocument();

    await act(async () => {
      resolveVerification?.({ data: { user: adminSession.user }, error: null });
    });

    expect(screen.getByTestId("location")).toHaveTextContent("/admin/login");
    expect(screen.queryByText("Admin analytics content")).not.toBeInTheDocument();
  });

  it("keeps the existing student authentication path working", async () => {
    supabaseTestDouble.state.session = createSession("student");
    renderAt("/");

    expect(await screen.findByText("Student dashboard content")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });
});
