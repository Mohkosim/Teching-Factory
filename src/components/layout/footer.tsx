import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { AiFillInstagram, AiFillFacebook, AiFillPlayCircle } from "react-icons/ai";
import Image from "next/image";

const footerLinks = {
    platform: [
        { label: "Beranda", href: "/" },
        { label: "Produk", href: "/produk" },
        { label: "Jasa", href: "/jasa" },
        { label: "Galeri", href: "/galeri" },
    ],
    info: [
        { label: "Tentang Kami", href: "/tentang" },
        { label: "Cara Kerja", href: "/cara-kerja" },
        { label: "Blog", href: "/blog" },
        { label: "FAQ", href: "/faq" },
    ],
};

export default function Footer() {
    return (
        <footer className="bg-dark text-white bg-sky-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center gap-2 mb-5">
                            <Image
                                src="/img/LogoTefa.png"
                                alt="Logo Tefa"
                                width={150}
                                height={80}
                                className="object-contain w-auto h-auto"
                                priority
                            />
                        </div>
                    </div>

                    {/* Platform Links */}
                    <div>
                        <h4 className="font-display font-bold text-sm uppercase tracking-wider text-white mb-5">Platform</h4>
                        <ul className="space-y-3">
                            {footerLinks.platform.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-white hover:text-primary text-sm transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Info Links */}
                    <div>
                        <h4 className="font-display font-bold text-sm uppercase tracking-wider text-white mb-5">Informasi</h4>
                        <ul className="space-y-3">
                            {footerLinks.info.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-white hover:text-primary text-sm transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Social */}
                    <div className="space-y-5">
                        <div className="space-y-3 text-white text-sm">
                            <div className="flex items-start gap-2.5">
                                <MapPin size={15} className=" mt-0.5 shrink-0" />
                                <span>Perum Permata Regency 1 Blok 10/28, Perun Gpa, Ngijo, Kec. Karang Ploso, Kabupaten Malang, Jawa Timur 65152.</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <Phone size={15} className="shrink-0 " />
                                <span>085176777785</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <Mail size={15} className="shrink-0" />
                                <span>info@hummatech.com</span>
                            </div>
                        </div>
                        <h4 className="font-display font-bold text-sm uppercase tracking-wider text-white mb-5">Ikuti Kami</h4>
                        <div className="flex gap-3">
                            {[AiFillInstagram, AiFillFacebook, AiFillPlayCircle].map((Icon, i) => (
                                <button
                                    key={i}
                                    className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-primary transition-colors duration-200"
                                >
                                    <Icon size={16} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-white text-xs">©Copyright 2026. All Rights Reserved by Hummatech</p>
                    <div className="flex gap-5">
                        <Link href="/privacy" className="text-white text-xs transition-colors">Kebijakan Privasi</Link>
                        <Link href="/terms" className="text-white text-xs transition-colors">Syarat & Ketentuan</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}