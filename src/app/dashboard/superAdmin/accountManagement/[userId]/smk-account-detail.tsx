"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
    ArrowLeft,
    Search,
    School,
    Layers,
    Package,
    Wrench,
    ExternalLink,
    BadgeCheck,
    Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import PaginationIconsOnly from "@/components/pagination/page";
import type { SMKAccountDetail } from "@/types/interfaces/accountAdmin";

const LIST_HREF = "/dashboard/superAdmin/accountManagement";
const PAGE_SIZE_DEFAULT = 10;

function formatTanggal(iso: string) {
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
    });
}

function StatusBadge({ aktif }: { aktif: boolean }) {
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${aktif ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                }`}
        >
            {aktif ? "Aktif" : "Nonaktif"}
        </span>
    );
}

function InfoItem({
    label,
    children,
    wide = false,
}: {
    label: string;
    children: ReactNode;
    wide?: boolean;
}) {
    return (
        <div
            className={`rounded-lg border border-gray-100 bg-gray-50 p-3 ${wide ? "sm:col-span-2 lg:col-span-3" : ""
                }`}
        >
            <p className="text-xs font-medium uppercase text-gray-400">{label}</p>
            <div className="mt-1 text-sm font-semibold text-gray-700 break-words">
                {children}
            </div>
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: number;
}) {
    return (
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <p className="text-xs font-medium uppercase text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    );
}

export default function SMKAccountDetailView({ data }: { data: SMKAccountDetail }) {
    const { smk, jurusans } = data;

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return jurusans;
        return jurusans.filter(
            (j) =>
                j.name.toLowerCase().includes(q) ||
                j.nama_jurusan.toLowerCase().includes(q) ||
                j.email.toLowerCase().includes(q) ||
                (j.kepala_jurusan ?? "").toLowerCase().includes(q)
        );
    }, [jurusans, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const jurusanAktif = jurusans.filter((j) => j.isActive).length;
    const totalProduk = jurusans.reduce((sum, j) => sum + (j.totalProduk ?? 0), 0);
    const totalJasa = jurusans.reduce((sum, j) => sum + (j.totalJasa ?? 0), 0);

    const mapsUrl =
        smk && smk.latitude != null && smk.longitude != null
            ? `https://www.google.com/maps?q=${smk.latitude},${smk.longitude}`
            : null;

    return (
        <div className="space-y-6 px-6 pb-8">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href={LIST_HREF}
                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
                        title="Kembali ke Manajemen Akun"
                        aria-label="Kembali ke Manajemen Akun"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <h1 className="text-xl font-bold text-foreground tracking-wide uppercase">
                        Detail Akun SMK
                    </h1>
                </div>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>Manajemen</BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href={LIST_HREF}>Manajemen Akun</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Detail SMK</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* ── Informasi SMK ── */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="h-20 w-20 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                        {data.img ? (
                            <Image
                                src={data.img}
                                alt={data.name}
                                width={80}
                                height={80}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <School className="h-9 w-9 text-blue-500" />
                        )}
                    </div>
                    <div className="min-w-0 space-y-2">
                        <h2 className="text-lg font-bold text-gray-800 break-words">
                            {data.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge aktif={data.isActive} />
                            {smk && (
                                <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${smk.status_verifikasi
                                            ? "bg-blue-100 text-blue-600"
                                            : "bg-amber-100 text-amber-600"
                                        }`}
                                >
                                    {smk.status_verifikasi ? (
                                        <BadgeCheck className="h-3.5 w-3.5" />
                                    ) : (
                                        <Clock className="h-3.5 w-3.5" />
                                    )}
                                    {smk.status_verifikasi ? "SMK Terverifikasi" : "Menunggu Verifikasi"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <InfoItem label="Email">{data.email}</InfoItem>
                    <InfoItem label="Telepon">{data.phone || "-"}</InfoItem>
                    <InfoItem label="Terdaftar Sejak">{formatTanggal(data.createdAt)}</InfoItem>

                    {smk ? (
                        <>
                            <InfoItem label="Penanggung Jawab">{smk.kepala_sekolah || "-"}</InfoItem>
                            <InfoItem label="Tahun Berdiri">{smk.tahun_berdiri}</InfoItem>
                            <InfoItem label="ID SMK">
                                <span className="font-mono text-xs">{smk.smk_id}</span>
                            </InfoItem>

                            <InfoItem label="Alamat" wide>
                                {smk.alamat}
                            </InfoItem>
                            <InfoItem label="Kecamatan">{smk.kecamatan || "-"}</InfoItem>
                            <InfoItem label="Kota / Kabupaten">{smk.kota}</InfoItem>
                            <InfoItem label="Provinsi">{smk.provinsi}</InfoItem>
                            <InfoItem label="Kode Pos">{smk.kode_pos || "-"}</InfoItem>
                            <InfoItem label="Koordinat">
                                {mapsUrl ? (
                                    <a
                                        href={mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                    >
                                        {smk.latitude}, {smk.longitude}
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                ) : (
                                    "-"
                                )}
                            </InfoItem>
                            <InfoItem label="Deskripsi" wide>
                                <span className="font-normal text-gray-600 whitespace-pre-line">
                                    {smk.deskripsi || "-"}
                                </span>
                            </InfoItem>
                        </>
                    ) : (
                        <InfoItem label="Data SMK" wide>
                            <span className="font-normal text-gray-500">
                                Admin SMK ini belum melengkapi data profil SMK (alamat, kepala sekolah,
                                dan lainnya).
                            </span>
                        </InfoItem>
                    )}
                </div>
            </section>

            {/* ── Ringkasan ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <StatCard
                    icon={<Layers className="h-5 w-5" />}
                    label="Jumlah Jurusan"
                    value={jurusans.length}
                />
                <StatCard
                    icon={<BadgeCheck className="h-5 w-5" />}
                    label="Jurusan Aktif"
                    value={jurusanAktif}
                />
                <StatCard
                    icon={<Package className="h-5 w-5" />}
                    label="Total Produk"
                    value={totalProduk}
                />
                <StatCard
                    icon={<Wrench className="h-5 w-5" />}
                    label="Total Jasa"
                    value={totalJasa}
                />
            </div>

            {/* ── Tabel akun jurusan ── */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-800">Daftar Akun Jurusan</h2>
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Cari jurusan, akun, atau email"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9 bg-gray-50 border-gray-200 rounded-xl text-sm"
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="w-16 font-semibold text-gray-600 px-6">No</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Logo</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Jurusan</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Nama Akun</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Kepala Jurusan</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Email</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Telepon</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Jam Operasional</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Produk</TableHead>
                            <TableHead className="font-semibold text-gray-600 px-6">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-12 text-gray-400">
                                    {jurusans.length === 0
                                        ? "Belum ada akun jurusan di SMK ini"
                                        : "Tidak ada data ditemukan"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((item, idx) => (
                                <TableRow
                                    key={item.jurusan_id}
                                    className={`h-16 transition-colors ${item.isActive ? "hover:bg-blue-50/30" : "bg-gray-50/60"
                                        }`}
                                >
                                    <TableCell className="text-gray-500 font-medium py-4 px-6">
                                        {(page - 1) * pageSize + idx + 1}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center shadow-sm overflow-hidden">
                                            {item.img ? (
                                                <Image
                                                    src={item.img}
                                                    alt={item.nama_jurusan}
                                                    width={40}
                                                    height={40}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <School className="h-5 w-5 text-blue-500" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700 py-4 px-6">
                                        {item.nama_jurusan}
                                    </TableCell>
                                    <TableCell className="text-gray-600 py-4 px-6">{item.name}</TableCell>
                                    <TableCell className="text-gray-600 py-4 px-6">
                                        {item.kepala_jurusan || "-"}
                                    </TableCell>
                                    <TableCell className="text-gray-600 py-4 px-6">{item.email}</TableCell>
                                    <TableCell className="text-gray-600 py-4 px-6">
                                        {item.phoneNumber || "-"}
                                    </TableCell>
                                    <TableCell className="text-gray-600 py-4 px-6">
                                        {item.jam_operasional || "-"}
                                    </TableCell>
                                    <TableCell className="text-gray-600 py-4 px-6">
                                        {item.totalProduk ?? 0}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <StatusBadge aktif={item.isActive} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                <PaginationIconsOnly
                    page={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalData={filtered.length}
                    onPageChange={(p) => setPage(p)}
                    onPageSizeChange={(s) => {
                        setPageSize(s);
                        setPage(1);
                    }}
                />
            </section>
        </div>
    );
}
