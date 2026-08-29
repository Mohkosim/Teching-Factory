import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className=" bg-sky-100">
      <Navbar />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
}