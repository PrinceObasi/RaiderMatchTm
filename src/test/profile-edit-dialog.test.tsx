import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Database } from "@/integrations/supabase/types";

type StudentProfile = Database["public"]["Tables"]["students"]["Row"];

const testDouble = vi.hoisted(() => ({
  update: vi.fn(),
  eq: vi.fn(),
  toast: vi.fn(),
  fetchProjectDepth: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: (values: unknown) => {
        testDouble.update(values);
        return { eq: testDouble.eq };
      },
    }),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: testDouble.toast }),
}));

vi.mock("@/lib/githubDepth", () => ({
  fetchProjectDepth: testDouble.fetchProjectDepth,
}));

import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { normalizeGithub, normalizeUrl } from "@/lib/profile";

const savedProfile = {
  user_id: "user-1",
  name: "Raider Red",
  email: "raider@ttu.edu",
  degree: "B.S. Computer Science",
  grad_month: 5,
  graduation_year: 2027,
  location_city: "Lubbock",
  location_state: "TX",
  is_international: false,
  has_prev_intern: true,
  gpa: 3.45,
  github: "raiderred",
  linkedin_url: "https://linkedin.com/in/raiderred",
  portfolio_url: null,
  phone: "(806) 555-0123",
  sms_opt_in: true,
  project_depth: 0.42,
} as unknown as StudentProfile;

// Radix Switch/Checkbox measure themselves; jsdom has no ResizeObserver.
vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

beforeEach(() => {
  vi.clearAllMocks();
  testDouble.eq.mockResolvedValue({ error: null });
  testDouble.fetchProjectDepth.mockResolvedValue(0.8);
});

function renderDialog(profile: StudentProfile = savedProfile) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(<ProfileEditDialog isOpen profile={profile} onSaved={onSaved} onClose={onClose} />);
  return { onSaved, onClose };
}

describe("ProfileEditDialog", () => {
  it("starts from the saved profile so saving without changes keeps every value", async () => {
    const user = userEvent.setup();
    const { onSaved, onClose } = renderDialog();

    expect(screen.getByLabelText("Major")).toHaveValue("B.S. Computer Science");
    expect(screen.getByLabelText("GPA (optional)")).toHaveValue("3.45");
    expect(screen.getByLabelText("GitHub username")).toHaveValue("raiderred");

    await user.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => expect(testDouble.update).toHaveBeenCalledOnce());
    expect(testDouble.update).toHaveBeenCalledWith(expect.objectContaining({
      degree: "B.S. Computer Science",
      grad_month: 5,
      graduation_year: 2027,
      location_city: "Lubbock",
      location_state: "TX",
      gpa: 3.45,
      has_prev_intern: true,
      github: "raiderred",
      linkedin_url: "https://linkedin.com/in/raiderred",
      phone: "(806) 555-0123",
      sms_opt_in: true,
      project_depth: 0.42,
    }));
    expect(testDouble.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(testDouble.fetchProjectDepth).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("normalizes pasted links and re-scores GitHub only when it changes", async () => {
    const user = userEvent.setup();
    renderDialog();

    const github = screen.getByLabelText("GitHub username");
    await user.clear(github);
    await user.type(github, "https://github.com/new-raider/");
    const portfolio = screen.getByLabelText("Portfolio");
    await user.type(portfolio, "raider.dev");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => expect(testDouble.update).toHaveBeenCalledOnce());
    expect(testDouble.fetchProjectDepth).toHaveBeenCalledWith("new-raider");
    expect(testDouble.update).toHaveBeenCalledWith(expect.objectContaining({
      github: "new-raider",
      portfolio_url: "https://raider.dev",
      project_depth: 0.8,
    }));
  });

  it("blocks an out-of-range GPA without writing to the database", async () => {
    const user = userEvent.setup();
    renderDialog();

    const gpa = screen.getByLabelText("GPA (optional)");
    await user.clear(gpa);
    await user.type(gpa, "4.7");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("Enter a GPA between 0.00 and 4.00.")).toBeInTheDocument();
    expect(testDouble.update).not.toHaveBeenCalled();
  });

  it("clears text updates when the phone number is removed", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.clear(screen.getByLabelText("Phone (optional)"));
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    await waitFor(() => expect(testDouble.update).toHaveBeenCalledOnce());
    expect(testDouble.update).toHaveBeenCalledWith(expect.objectContaining({ phone: null, sms_opt_in: false }));
  });
});

describe("profile link helpers", () => {
  it.each([
    ["octocat", "octocat"],
    ["@octocat", "octocat"],
    ["github.com/octocat", "octocat"],
    ["https://www.github.com/octocat/repo?tab=1", "octocat"],
  ])("normalizeGithub(%s)", (input, expected) => {
    expect(normalizeGithub(input)).toBe(expected);
  });

  it("adds or upgrades to https", () => {
    expect(normalizeUrl("linkedin.com/in/me")).toBe("https://linkedin.com/in/me");
    expect(normalizeUrl("http://me.dev")).toBe("https://me.dev");
    expect(normalizeUrl("  ")).toBe("");
  });
});
