import { TbLayoutDashboardFilled, TbTruckDelivery } from "react-icons/tb";
import { MdManageAccounts, MdMiscellaneousServices, MdStickyNote2 } from "react-icons/md";
import { AiFillExclamationCircle } from "react-icons/ai";
import { IoMdMailUnread } from "react-icons/io";
import { IoWallet } from "react-icons/io5";
import { BsBoxFill } from "react-icons/bs";
import { RiGalleryFill } from "react-icons/ri";
import { GiWallet } from "react-icons/gi";

import { IconType } from "react-icons";

export type Role = "SuperAdmin" | "AdminSMK" | "AdminJurusan";

export interface NavItem {
  href: string;
  label: string;
  icon: IconType;
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface NavParams {
  smkSlug?: string;
  jurusanSlug?: string;
}

const navConfig: Record<Role, (params: NavParams) => NavGroup[]> = {
  SuperAdmin: () => [
    {
      label: "UMUM",
      items: [
        { href: "/dashboard/superAdmin", label: "Dashboard", icon: TbLayoutDashboardFilled, exact: true },
      ],
    },
    {
      label: "MANAJEMEN",
      items: [
        { href: "/dashboard/superAdmin/accountManagement", label: "Manajemen Akun", icon: MdManageAccounts },
        { href: "/dashboard/superAdmin/aboutTefa", label: "Tentang Tefa", icon: AiFillExclamationCircle },
        { href: "/dashboard/superAdmin/incomingContact", label: "Kontak Masuk", icon: IoMdMailUnread },
      ],
    },
    {
      label: "WITHDRAWAL",
      items: [
        { href: "/dashboard/superAdmin/penarikan-saldo", label: "Penarikan Saldo", icon: GiWallet },
      ],
    },
  ],

  AdminSMK: ({ smkSlug }) => {
    const base = `/dashboard/adminSMK/${smkSlug ?? ""}`;
    return [
      {
        label: "UMUM",
        items: [
          { href: base, label: "Dashboard", icon: TbLayoutDashboardFilled, exact: true },
        ],
      },
      {
        label: "MANAJEMEN",
        items: [
          { href: `${base}/accountManagement`, label: "Manajemen Akun", icon: MdManageAccounts },
          { href: `${base}/productManagement`, label: "Manajemen Produk", icon: BsBoxFill },
          { href: `${base}/serviceManagement`, label: "Manajemen Jasa", icon: MdMiscellaneousServices },
        ],
      },
      {
        label: "LAPORAN",
        items: [
          { href: `${base}/financialStatements`, label: "Laporan Keuangan", icon: IoWallet },
        ],
      },
    ];
  },

  AdminJurusan: ({ smkSlug, jurusanSlug }) => {
    const base = jurusanSlug
      ? `/dashboard/adminJurusan/${smkSlug ?? ""}/${jurusanSlug}`
      : `/dashboard/adminJurusan`;

    return [
      {
        label: "UMUM",
        items: [
          { href: base, label: "Dashboard", icon: TbLayoutDashboardFilled, exact: true },
        ],
      },
      {
        label: "MANAJEMEN",
        items: [
          { href: `${base}/productManagement`, label: "Manajemen Produk", icon: BsBoxFill },
          { href: `${base}/serviceManagement`, label: "Manajemen Jasa", icon: MdMiscellaneousServices },
          { href: `${base}/orderManagement`, label: "Manajemen Pesanan", icon: MdStickyNote2 },
          { href: `${base}/shippingManagement`, label: "Manajemen Pengiriman", icon: TbTruckDelivery },
          { href: `${base}/galleryManagement`, label: "Manajemen Galeri", icon: RiGalleryFill },
        ],
      },
      {
        label: "LAPORAN",
        items: [
          { href: `${base}/financialStatements`, label: "Laporan Keuangan", icon: IoWallet },
        ],
      },
    ];
  },
};

export function getNavGroups(role: Role, params: NavParams = {}): NavGroup[] {
  const builder = navConfig[role];
  return builder ? builder(params) : [];
}