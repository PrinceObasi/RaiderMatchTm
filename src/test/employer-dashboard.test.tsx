import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const testDouble = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  order: vi.fn(),
  rpc: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: testDouble.getUser },
    from: testDouble.from,
    rpc: testDouble.rpc,
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: testDouble.toast }),
}));

vi.mock("@/components/AnalyticsDashboard", () => ({
  AnalyticsDashboard: () => <div>Employer analytics</div>,
}));

vi.mock("@/components/JobApplicants", () => ({
  JobApplicants: () => null,
}));

import { EmployerDashboard } from "@/components/EmployerDashboard";

const employerId = "22222222-2222-4222-8222-222222222222";
const internship = {
  id: "33333333-3333-4333-8333-333333333333",
  role_title: "Software Engineer Intern",
  description_text: "Build reliable software for students and employers.",
  summary_text: null,
  location: "Austin, TX",
  company: "Acme",
  date_posted: "2026-09-17",
  deadline: "2026-10-17",
  is_active: true,
  application_link: "https://example.com/Apply/CaseSensitive",
  direct_link: "https://example.com/Apply/CaseSensitive",
  apply_url: "https://example.com/Apply/CaseSensitive",
  employer_id: employerId,
  created_at: "2026-09-17T12:00:00.000Z",
  updated_at: "2026-09-17T12:00:00.000Z",
  tech_stack: ["TypeScript"],
  employment_type: "internship",
};

beforeEach(() => {
  vi.clearAllMocks();
  testDouble.getUser.mockResolvedValue({
    data: {
      user: {
        id: employerId,
        app_metadata: { role: "employer", company: "Acme" },
      },
    },
    error: null,
  });
  testDouble.order.mockResolvedValue({ data: [internship], error: null });
  testDouble.from.mockImplementation((table: string) => {
    if (table !== "internships") throw new Error(`Unexpected table: ${table}`);
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ order: testDouble.order })),
      })),
    };
  });
  testDouble.rpc.mockImplementation(async (name: string, args?: Record<string, unknown>) => {
    if (name === "get_employer_application_counts") {
      return {
        data: [{ internship_id: internship.id, applicant_count: 2 }],
        error: null,
      };
    }
    if (name === "set_employer_internship_active") {
      const isActive = Boolean(args?.p_is_active);
      return {
        data: {
          success: true,
          is_active: isActive,
          message: isActive
            ? "Listing activated successfully."
            : "Listing deactivated successfully.",
        },
        error: null,
      };
    }
    return { data: { success: true }, error: null };
  });
});

describe("EmployerDashboard", () => {
  it("uses canonical employer RPCs for posting and listing status", async () => {
    const user = userEvent.setup();
    render(
      <EmployerDashboard onLogout={vi.fn()} onOpenSettings={vi.fn()} />,
    );

    expect(await screen.findByText("Software Engineer Intern")).toBeInTheDocument();
    expect(testDouble.from).toHaveBeenCalledWith("internships");
    expect(testDouble.rpc).toHaveBeenCalledWith(
      "get_employer_application_counts",
    );

    await user.clear(screen.getByLabelText("Job Title"));
    await user.type(screen.getByLabelText("Job Title"), "Backend Engineering Intern");
    await user.type(screen.getByLabelText("Location"), "Dallas, TX");
    await user.type(
      screen.getByLabelText("Description"),
      "Build and maintain production backend services for RaiderMatch users.",
    );
    await user.type(
      screen.getByLabelText("Application URL"),
      "https://example.com/Apply/PreserveCase",
    );
    await user.type(screen.getByLabelText("Required Skills"), "TypeScript, PostgreSQL");
    await user.click(screen.getByRole("button", { name: "Post Internship" }));

    await waitFor(() => {
      expect(testDouble.rpc).toHaveBeenCalledWith(
        "create_employer_internship",
        expect.objectContaining({
          p_role_title: "Backend Engineering Intern",
          p_location: "Dallas, TX",
          p_application_url: "https://example.com/Apply/PreserveCase",
          p_tech_stack: ["TypeScript", "PostgreSQL"],
          p_is_texas: true,
          p_visa_sponsorship: "No",
        }),
      );
    });

    await user.click(screen.getByRole("switch", { name: "Active" }));
    await waitFor(() => {
      expect(testDouble.rpc).toHaveBeenCalledWith(
        "set_employer_internship_active",
        {
          p_internship_id: internship.id,
          p_is_active: false,
        },
      );
    });
  });

  it("keeps a listing inactive when the server refuses activation", async () => {
    const user = userEvent.setup();
    testDouble.order.mockResolvedValue({
      data: [{ ...internship, is_active: false }],
      error: null,
    });
    testDouble.rpc.mockImplementation(async (name: string) => {
      if (name === "get_employer_application_counts") {
        return {
          data: [{ internship_id: internship.id, applicant_count: 2 }],
          error: null,
        };
      }
      if (name === "set_employer_internship_active") {
        return {
          data: {
            success: false,
            is_active: false,
            message: "Listing was kept inactive by internship eligibility rules.",
          },
          error: null,
        };
      }
      return { data: { success: true }, error: null };
    });

    render(
      <EmployerDashboard onLogout={vi.fn()} onOpenSettings={vi.fn()} />,
    );

    const statusSwitch = await screen.findByRole("switch", { name: "Inactive" });
    expect(statusSwitch).not.toBeChecked();

    await user.click(statusSwitch);

    await waitFor(() => {
      expect(testDouble.rpc).toHaveBeenCalledWith(
        "set_employer_internship_active",
        {
          p_internship_id: internship.id,
          p_is_active: true,
        },
      );
      expect(statusSwitch).not.toBeChecked();
      expect(testDouble.toast).toHaveBeenCalledWith({
        title: "Job status unchanged",
        description: "Listing was kept inactive by internship eligibility rules.",
      });
    });
  });
});
