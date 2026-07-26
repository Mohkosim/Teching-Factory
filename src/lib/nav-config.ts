import { TbLayoutDashboardFilled, TbTruckDelivery } from "react-icons/tb";
import { MdManageAccounts, MdMiscellaneousServices, MdStickyNote2 } from "react-icons/md";
import { AiFillExclamationCircle } from "react-icons/ai";
import { IoMdMailUnread } from "react-icons/io";
import { IoWallet } from "react-icons/io5";
import { BsBoxFill } from "react-icons/bs";
import { RiGalleryFill } from "react-icons/ri";

import { IconType } from "react-icons";

export type Role = "SuperAdmin" | "AdminSMK" | "AdminJurusan";

export interface NavItem {
  href: string;
  label: string;
  icon: IconType;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const navConfig: Record<Role, NavGroup[]> = {
  SuperAdmin: [
    {
      label: "UMUM",
      items: [
        { href: "/dashboard/superAdmin", label: "Dashboard", icon: TbLayoutDashboardFilled },
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
  ],

  AdminSMK: [
    {
      label: "UMUM",
      items: [
        { href: "/dashboard/adminSMK", label: "Dashboard", icon: TbLayoutDashboardFilled },
      ],
    },
    {
      label: "MANAJEMEN",
      items: [
        { href: "/dashboard/adminSMK/accountManagement", label: "Manajemen Akun", icon: MdManageAccounts },
        { href: "/dashboard/adminSMK/productManagement", label: "Manajemen Produk", icon: BsBoxFill },
        { href: "/dashboard/adminSMK/serviceManagement", label: "Manajemen Jasa", icon: MdMiscellaneousServices },
      ],
    },
    {
      label: "LAPORAN",
      items: [
        { href: "/dashboard/adminSMK/financialStatements", label: "Laporan Keuangan", icon: IoWallet },
      ],
    },
  ],

  AdminJurusan: [
    {
      label: "UMUM",
      items: [
        { href: "/dashboard/adminJurusan", label: "Dashboard", icon: TbLayoutDashboardFilled },
      ],
    },
    {
      label: "MANAJEMEN",
      items: [
        { href: "/dashboard/adminJurusan/productManagement", label: "Manajemen Produk", icon: BsBoxFill },
        { href: "/dashboard/adminJurusan/serviceManagement", label: "Manajemen Jasa", icon: MdMiscellaneousServices },
        { href: "/dashboard/adminJurusan/orderManagement", label: "Manajemen Pesanan", icon: MdStickyNote2 },
        { href: "/dashboard/adminJurusan/shippingManagement", label: "Manajemen Pengiriman", icon: TbTruckDelivery },
        { href: "/dashboard/adminJurusan/galleryManagement", label: "Manajemen Galeri", icon: RiGalleryFill },
      ],
    },
    {
      label: "LAPORAN",
      items: [
        { href: "/dashboard/adminJurusan/financialStatements", label: "Laporan Keuangan", icon: IoWallet },
      ],
    },
  ],
};

export function getNavGroups(role: Role): NavGroup[] {
  return navConfig[role] ?? [];
}