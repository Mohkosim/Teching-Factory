export interface SMKAccount {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  img: string | null;
  role: "User" | "SuperAdmin" | "AdminSMK" | "AdminJurusan";
  isActive: boolean;

  kepala_sekolah?: string | null;
  smk_id?: string | null;
  alamat?: string | null;
  kota?: string | null;
  provinsi?: string | null;
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

export interface SMKAccountDetail {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  img: string | null;
  isActive: boolean;
  createdAt: string;

  smk: {
    smk_id: string;
    kepala_sekolah: string | null;
    deskripsi: string | null;
    alamat: string;
    kecamatan: string | null;
    kota: string;
    kode_pos: string | null;
    provinsi: string;
    latitude: number | null;
    longitude: number | null;
    tahun_berdiri: number | null;
  } | null;

  jurusans: JurusanAccount[];
}
