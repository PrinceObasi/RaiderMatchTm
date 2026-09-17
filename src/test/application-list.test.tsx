import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const testDouble = vi.hoisted(() => ({
  from: vi.fn(),
  order: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: testDouble.from,
    rpc: testDouble.rpc,
  },
}));

vi.mock("@/components/FastAddModal", () => ({
  FastAddModal: () => null,
}));

import { ApplicationList } from "@/components/ApplicationList";

const externalSavedApplication = {
  id: "11111111-1111-4111-8111-111111111111",
  internship_id: null,
  applied_at: null,
  status: "saved",
  status_changed_at: "2026-09-17T12:00:00.000Z",
  last_updated_at: "2026-09-17T12:00:00.000Z",
  note: null,
  source: "external",
  external_company: "Stripe",
  external_role_title: "Software Engineer Intern",
  external_url: "https://example.com/apply",
  external_location: "Austin, TX",
  deadline: "2026-10-01",
  internships: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  testDouble.order.mockResolvedValue({
    data: [externalSavedApplication],
    error: null,
  });
  testDouble.from.mockReturnValue({
    select: vi.fn(() => ({ order: testDouble.order })),
  });
  testDouble.rpc.mockResolvedValue({ data: { success: true }, error: null });
});

describe("ApplicationList", () => {
  it("maps canonical external columns and persists status and notes through RPCs", async () => {
    const user = userEvent.setup();
    render(<ApplicationList />);

    await user.click(await screen.findByText("Stripe"));
    expect(screen.getByText("Software Engineer Intern")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Assessment/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Applied/ }));
    await waitFor(() => {
      expect(testDouble.rpc).toHaveBeenCalledWith(
        "update_application_status",
        {
          p_application_id: externalSavedApplication.id,
          p_new_status: "applied",
        },
      );
    });

    await user.click(screen.getByText("Click to add a note..."));
    await user.type(
      screen.getByPlaceholderText(/recruiter name/i),
      "Recruiter call Thursday",
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(testDouble.rpc).toHaveBeenCalledWith(
        "update_application_note",
        {
          p_application_id: externalSavedApplication.id,
          p_note: "Recruiter call Thursday",
        },
      );
    });
    expect(testDouble.from).toHaveBeenCalledWith("applications");
  });
});
