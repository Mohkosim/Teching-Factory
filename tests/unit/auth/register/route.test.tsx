import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import RegisterForm from "@/app/auth/register/register-form";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
    usePathname: () => "/auth/register", // dipakai AuthTabs
}));

vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("sweetalert2", () => ({
    default: { close: vi.fn() },
}));

vi.mock("@/lib/utils/alert", () => ({
    tampilkanLoading: vi.fn(),
}));

const mockedToastSuccess = vi.mocked(toast.success);
const mockedToastError = vi.mocked(toast.error);
const mockedToastWarning = vi.mocked(toast.warning);

const payloadValid = {
    username: "user_satu",
    email: "usersatu@gmail.com",
    password: "Password123",
};

async function isiFormValid(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/nama pengguna/i), payloadValid.username);
    await user.type(screen.getByLabelText(/e-mail/i), payloadValid.email);
    await user.type(screen.getByLabelText(/kata sandi/i), payloadValid.password);
}

beforeEach(() => {
    pushMock.mockReset();
    mockedToastSuccess.mockReset();
    mockedToastError.mockReset();
    mockedToastWarning.mockReset();
    vi.stubGlobal("fetch", vi.fn());
});

describe("RegisterForm - validasi input", () => {
    it("menampilkan pesan error saat submit form kosong", async () => {
        const user = userEvent.setup();
        render(<RegisterForm />);

        await user.click(screen.getByRole("button", { name: /buat akun/i }));

        expect(await screen.findByText("Nama pengguna wajib diisi")).toBeInTheDocument();
        expect(await screen.findByText("E-mail wajib diisi")).toBeInTheDocument();
        expect(await screen.findByText("Kata sandi wajib diisi")).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it("menampilkan error jika password tidak mengandung huruf kapital", async () => {
        const user = userEvent.setup();
        render(<RegisterForm />);

        await user.type(screen.getByLabelText(/nama pengguna/i), payloadValid.username);
        await user.type(screen.getByLabelText(/e-mail/i), payloadValid.email);
        await user.type(screen.getByLabelText(/kata sandi/i), "password123");
        await user.click(screen.getByRole("button", { name: /buat akun/i }));

        expect(
            await screen.findByText("Harus mengandung minimal 1 huruf kapital")
        ).toBeInTheDocument();
    });
});

describe("RegisterForm - proses submit", () => {
    it("berhasil daftar -> fetch dipanggil dengan data yang benar & redirect ke halaman verifikasi OTP", async () => {
        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({ message: "Akun berhasil dibuat" }),
        } as Response);

        mockedToastSuccess.mockImplementation((_msg, opts) => {
            opts?.onAutoClose?.({} as never);
            return "toast-id";
        });

        const user = userEvent.setup();
        render(<RegisterForm />);

        await isiFormValid(user);
        await user.click(screen.getByRole("button", { name: /buat akun/i }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/auth/register",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payloadValid),
                })
            );
        });

        // setelah daftar, user harus verifikasi OTP dulu (bukan langsung ke halaman login)
        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith("/auth/verify-otp?email=usersatu%40gmail.com");
        });
        expect(pushMock).not.toHaveBeenCalledWith("/auth/login");
        expect(mockedToastWarning).not.toHaveBeenCalled();
        expect(mockedToastError).not.toHaveBeenCalled();
    });

    it("akun dibuat tapi email OTP gagal terkirim (pendingVerification) -> tampil peringatan, tetap diarahkan ke halaman verifikasi OTP", async () => {
        vi.mocked(global.fetch).mockResolvedValue({
            ok: false,
            json: async () => ({
                pendingVerification: true,
                message: "Email belum terkirim, silakan kirim ulang kode.",
            }),
        } as Response);

        mockedToastWarning.mockImplementation((_msg, opts) => {
            opts?.onAutoClose?.({} as never);
            return "toast-id";
        });

        const user = userEvent.setup();
        render(<RegisterForm />);

        await isiFormValid(user);
        await user.click(screen.getByRole("button", { name: /buat akun/i }));

        await waitFor(() => {
            expect(mockedToastWarning).toHaveBeenCalledWith(
                "Akun dibuat, tapi email belum terkirim",
                expect.objectContaining({ description: "Email belum terkirim, silakan kirim ulang kode." })
            );
        });
        await waitFor(() => {
            expect(pushMock).toHaveBeenCalledWith("/auth/verify-otp?email=usersatu%40gmail.com");
        });
        expect(mockedToastError).not.toHaveBeenCalled(); // bukan dianggap gagal daftar
    });

    it("gagal daftar karena email sudah terdaftar -> tampil toast error dengan pesan dari server", async () => {
        vi.mocked(global.fetch).mockResolvedValue({
            ok: false,
            json: async () => ({ message: "E-mail sudah terdaftar" }),
        } as Response);

        const user = userEvent.setup();
        render(<RegisterForm />);

        await isiFormValid(user);
        await user.click(screen.getByRole("button", { name: /buat akun/i }));

        await waitFor(() => {
            expect(mockedToastError).toHaveBeenCalledWith(
                "Gagal membuat akun",
                expect.objectContaining({ description: "E-mail sudah terdaftar" })
            );
        });
        expect(pushMock).not.toHaveBeenCalled();
    });

    it("gagal daftar karena error jaringan -> tampil toast error dengan pesan generik", async () => {
        vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

        const user = userEvent.setup();
        render(<RegisterForm />);

        await isiFormValid(user);
        await user.click(screen.getByRole("button", { name: /buat akun/i }));

        await waitFor(() => {
            expect(mockedToastError).toHaveBeenCalledWith(
                "Gagal membuat akun",
                expect.objectContaining({ description: "Network error" })
            );
        });
    });
});