"use client";

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationEllipsis,
} from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { ChevronLeft, ChevronRight } from "lucide-react";


interface TablePaginationProps {
    page: number;
    totalPages: number;
    pageSize: number;
    totalData: number;
    pageSizeOptions?: number[];
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}


export default function PaginationIconsOnly({
    page,
    totalPages,
    pageSize,
    totalData,
    pageSizeOptions = [10, 25, 50],
    onPageChange,
    onPageSizeChange,
}: TablePaginationProps) {

    const start = totalData === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalData);

    const getPageNumbers = (): (number | "...")[] => {
        const pages: (number | "...")[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (page > 3) pages.push("...");
            for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
                pages.push(i);
            }
            if (page < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/30">
            {/* Info */}
            <p className="text-sm text-gray-500">
                Showing {start}–{end} of {totalData} data
            </p>

            <div className="flex items-center gap-4">
                {/* Rows per page */}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Tampilkan :</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(v) => onPageSizeChange(Number(v))}
                    >
                        <SelectTrigger className="h-8 w-20 text-xs border-gray-200 rounded-lg">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="start">
                            {pageSizeOptions.map((s) => (
                                <SelectItem key={s} value={String(s)} className="text-xs">
                                    {s}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Pagination */}
                <Pagination className="mx-0 w-auto">
                    <PaginationContent className="gap-1">
                        {/* Previous */}
                        <PaginationItem>
                            <PaginationLink
                                onClick={() => onPageChange(page - 1)}
                                aria-disabled={page === 1}
                                className={`h-8 w-8 rounded-lg border-0 cursor-pointer ${page === 1
                                        ? "opacity-40 cursor-not-allowed pointer-events-none"
                                        : "hover:bg-gray-100"
                                    }`}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </PaginationLink>
                        </PaginationItem>

                        {/* Page Numbers */}
                        {getPageNumbers().map((p, i) =>
                            p === "..." ? (
                                <PaginationItem key={`dots-${i}`}>
                                    <PaginationEllipsis className="h-8 w-8" />
                                </PaginationItem>
                            ) : (
                                <PaginationItem key={p}>
                                    <PaginationLink
                                        onClick={() => onPageChange(p as number)}
                                        isActive={page === p}
                                        className={`h-8 w-8 rounded-lg text-sm font-medium cursor-pointer border-0 ${page === p
                                                ? "bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
                                                : "text-gray-600 hover:bg-gray-100"
                                            }`}
                                    >
                                        {p}
                                    </PaginationLink>
                                </PaginationItem>
                            )
                        )}

                        {/* Next */}
                        <PaginationItem>
                            <PaginationLink
                                onClick={() => onPageChange(page + 1)}
                                aria-disabled={page === totalPages || totalPages === 0}
                                className={`h-8 w-8 rounded-lg border-0 cursor-pointer ${page === totalPages || totalPages === 0
                                        ? "opacity-40 cursor-not-allowed pointer-events-none"
                                        : "hover:bg-gray-100"
                                    }`}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </PaginationLink>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </div>
    );
}