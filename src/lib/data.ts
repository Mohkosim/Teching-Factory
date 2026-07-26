export type SMKAccount = {
  id: number;
  name: string;
  username: string;
  email: string;
  description: string;
  phoneNumber: string;
  totalProduk?: number;
  totalJasa?: number;
};

export const smkData: SMKAccount[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: "Telekomunikasi",
  username: "Telekomunikasi",
  email: "telekominaksi@gmail.com",
  logo: "/school-logo.png",
  description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  phoneNumber: "08231238261123",
}));