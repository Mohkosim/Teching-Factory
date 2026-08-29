import { redirect } from "next/navigation";
import { getCheckoutItems } from "@/lib/getdata/get-checkout-items";
import { getAlamatList } from "@/lib/getdata/get-alamat-list";
import CheckoutClient from "./checkout-client";

interface CheckoutPageProps {
    searchParams: Promise<{ items?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
    const params = await searchParams;
    const ids = params.items?.split(",").filter(Boolean) ?? [];

    if (ids.length === 0) {
        redirect("/keranjang");
    }

    const [produk, alamatList] = await Promise.all([
        getCheckoutItems(ids),
        getAlamatList(),
    ]);

    if (produk.length === 0) {
        redirect("/keranjang");
    }

    return (
        <CheckoutClient
            initialProduk={produk}
            initialAlamatList={alamatList}
        />
    );
}