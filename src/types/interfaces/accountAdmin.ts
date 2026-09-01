export interface SMKAccount {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  img: string | null;
  role: "User" | "SuperAdmin" | "AdminSMK" | "AdminJurusan";
  isActive: boolean;

  // Data dari relasi SMK (opsional, hanya ada kalau role AdminSMK)
  kepala_sekolah?: string | null;
  smk_id?: string | null;
  alamat?: string | null;
  kota?: string | null;
  provinsi?: string | null;
  status_verifikasi?: boolean | null;
}

export interface JurusanAccount {
  jurusan_id: string;
  user_id: string;
  smk_id: string;
  img: string | null;
  nama_jurusan: string;
  deskripsi: string | null;
  kepala_jurusan: string | null;
  jam_operasional: string | null;
  name: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  totalProduk?: number;
  totalJasa?: number;
};