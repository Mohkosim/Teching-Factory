import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import LoginForm from "@/app/auth/login/login-form";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/auth/login",
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("sweetalert2", () => ({
  default: { close: vi.fn() },
}));

vi.mock("@/lib/utils/alert", () => ({
  tampilkanLoading: vi.fn(),
}));

const mockedSignIn = vi.mocked(signIn);
const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);

beforeEach(() => {
  mockedSignIn.mockReset();
  mockedToastSuccess.mockReset();
  mockedToastError.mockReset();
  pushMock.mockReset();

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: async () => ({ user: { role: "User" } }),
    })
  );
});

describe("LoginForm - tombol Lupa Kata Sandi", () => {
  it("menampilkan link 'Lupa Kata Sandi?' yang mengarah ke /auth/forgot-password", () => {
    render(<LoginForm />);

    const link = screen.getByRole("link", { name: /lupa kata sandi/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/auth/forgot-password");
  });
});

describe("LoginForm - validasi input", () => {
  it("menampilkan pesan error saat submit form kosong", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /^masuk$/i }));

    expect(await screen.findByText("E-mail wajib diisi")).toBeInTheDocument();
    expect(await screen.findByText("Kata sandi wajib diisi")).toBeInTheDocument();
    expect(mockedSignIn).not.toHaveBeenCalled();
  });
});

describe("LoginForm - proses submit", () => {
  it("login berhasil -> signIn dipanggil dengan credentials yang benar", async () => {
    mockedSignIn.mockResolvedValue({ error: undefined, ok: true } as never);
    mockedToastSuccess.mockImplementation((_msg, opts) => {
      opts?.onAutoClose?.({} as never);
      return "toast-id";
    });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/e-mail/i), "user@gmail.com");
    await user.type(screen.getByLabelText(/kata sandi/i), "password123");
    await user.click(screen.getByRole("button", { name: /^masuk$/i }));

    await waitFor(() => {
      expect(mockedSignIn).toHaveBeenCalledWith("credentials", {
        email: "user@gmail.com",
        password: "password123",
        redirect: false,
      });
    });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("login gagal karena akun dinonaktifkan -> tampil toast error khusus", async () => {
    mockedSignIn.mockResolvedValue({ error: "AccountDisabled" } as never);

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/e-mail/i), "user@gmail.com");
    await user.type(screen.getByLabelText(/kata sandi/i), "password123");
    await user.click(screen.getByRole("button", { name: /^masuk$/i }));

    await waitFor(() => {
      expect(mockedToastError).toHaveBeenCalledWith(
        "Akun dinonaktifkan",
        expect.objectContaining({
          description: expect.stringContaining("dinonaktifkan"),
        })
      );
    });
  });

  it("klik 'Masuk dengan Google' -> signIn dipanggil dengan provider google", async () => {
    mockedSignIn.mockResolvedValue({ error: undefined } as never);

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /masuk dengan google/i }));

    expect(mockedSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });
});