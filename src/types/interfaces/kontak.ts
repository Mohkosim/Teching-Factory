export interface KontakPayload {
  nama: string;
  email: string;
  phone: string;
  pesan: string;
}

export interface PesanApi {
  pesan_id: string;
  nama: string;
  email: string;
  phone: string | null;
  pesan: string;
  isRead: boolean;
  isFavorite: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}