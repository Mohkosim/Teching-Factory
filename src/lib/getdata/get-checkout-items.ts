import { getKeranjangItems } from "./get-keranjang";

export async function getCheckoutItems(ids: string[]) {
    const semuaItems = await getKeranjangItems();
    return semuaItems.filter((item) => ids.includes(item.id));
}