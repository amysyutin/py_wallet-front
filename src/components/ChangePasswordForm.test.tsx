import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { changePassword } from "../api/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

vi.mock("../api/auth", () => ({ changePassword: vi.fn() }));

const changePasswordMock = vi.mocked(changePassword);

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ChangePasswordForm language="en" />
    </QueryClientProvider>,
  );
}

function fillPasswords(current: string, next: string, confirmation: string) {
  fireEvent.change(screen.getByLabelText("Current password"), { target: { value: current } });
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: next } });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: confirmation },
  });
}

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    changePasswordMock.mockReset();
  });

  it("rejects mismatched passwords without calling the backend", () => {
    renderForm();
    fillPasswords("current-pass", "next-password", "other-password");

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(screen.getByRole("alert")).toHaveTextContent("The new passwords do not match.");
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it("submits valid passwords and clears the fields", async () => {
    changePasswordMock.mockResolvedValue(undefined);
    renderForm();
    fillPasswords("current-pass", "next-password", "next-password");

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    await waitFor(() => {
      expect(changePasswordMock.mock.calls[0]?.[0]).toEqual({
        current_password: "current-pass",
        new_password: "next-password",
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Password changed successfully.");
    expect(screen.getByLabelText<HTMLInputElement>("Current password").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("New password").value).toBe("");
    expect(screen.getByLabelText<HTMLInputElement>("Confirm new password").value).toBe("");
  });
});
