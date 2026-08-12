export interface TentangTefaFotoApi {
  foto_id: string;
  url: string;
}

export interface TentangTefaApi {
  tentang_id: string;
  deskripsi: string;
  videoLink: string | null;
  dokumentasi: TentangTefaFotoApi[];
  createdAt: string;
  updatedAt: string;
}