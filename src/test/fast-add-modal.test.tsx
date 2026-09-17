import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const testDouble = vi.hoisted(() => ({
  rpc: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: testDouble.rpc },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: testDouble.toast }),
}));

import { FastAddModal } from "@/components/FastAddModal";

beforeEach(() => {
  vi.clearAllMocks();
  testDouble.rpc.mockResolvedValue({ data: { success: true }, error: null });
});

describe("FastAddModal", () => {
  it("creates an external tracker entry through the guarded RPC", async () => {
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<FastAddModal onSuccess={onSuccess} />);

    await user.click(screen.getByRole("button", { name: "Add application" }));
    await user.type(screen.getByLabelText("Company *"), "Stripe");
    await user.type(screen.getByLabelText("Role *"), "Software Engineer Intern");
    await user.type(
      screen.getByLabelText("Job posting URL"),
      "https://example.com/Apply/ABC?Token=XyZ",
    );
    await user.type(screen.getByLabelText("Location"), "Austin, TX");
    await user.type(screen.getByLabelText("Note"), "Follow up next Friday");
    await user.click(screen.getByRole("button", { name: "Add to tracker" }));

    await waitFor(() => {
      expect(testDouble.rpc).toHaveBeenCalledWith("fast_add_application", {
        p_company: "Stripe",
        p_role_title: "Software Engineer Intern",
        p_status: "applied",
        p_url: "https://example.com/Apply/ABC?Token=XyZ",
        p_location: "Austin, TX",
        p_note: "Follow up next Friday",
      });
    });
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("rejects an invalid external URL before calling Supabase", async () => {
    const user = userEvent.setup();
    render(<FastAddModal onSuccess={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Add application" }));
    await user.type(screen.getByLabelText("Company *"), "Example");
    await user.type(screen.getByLabelText("Role *"), "Developer");
    await user.type(screen.getByLabelText("Job posting URL"), "javascript:alert(1)");
    await user.click(screen.getByRole("button", { name: "Add to tracker" }));

    expect(testDouble.rpc).not.toHaveBeenCalled();
    expect(testDouble.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Enter a valid job posting URL" }),
    );
  });
});
