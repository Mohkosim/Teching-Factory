import Image from "next/image";

const floatingIcons = [
  { img: "/img/whatsapp.png", top: "1%", left: "-80%", width: 54, height: 70 },
  { img: "/img/instagram.png", top: "22%", left: "-45%", width: 50, height: 50 },
  { img: "/img/messenger.png", top: "30%", left: "-100%", width: 44, height: 44 },
  { img: "/img/facebook.png", top: "42%", left: "-78%", width: 120, height: 70 },
  { img: "/img/like.png", top: "16%", right: "-45%", width: 50, height: 50 },
  { img: "/img/pinterest.png", top: "1%", right: "-73%", width: 60, height: 60 },
  { img: "/img/x.png", top: "32%", right: "-60%", width: 40, height: 40 },
  { img: "/img/tiktok.png", top: "40%", right: "-80%", width: 70, height: 100 },
];

export default function PartnerHero() {
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-sky-500 to-sky-600 px-4 pt-14 text-center">
      <h1 className="text-2xl font-extrabold text-white md:text-4xl">
        Partner with TEFA
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-blue-100">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </p>

      <div className="relative mx-auto mt-10 h-64 w-64 md:h-72 md:w-72">
        <div className="absolute inset-0 rounded-full bg-sky-300/70" />

        <div className="absolute inset-4 rounded-full bg-white md:inset-3" />

        <div className="absolute -inset-x-10 -top-10 bottom-0">
          <Image
            src="/img/Frame.png"
            alt="Partner with TEFA"
            fill
            className="object-contain object-bottom"
          />
        </div>

        {/* social icons melayang */}
        {floatingIcons.map((icon, i) => (
          <Image
            key={i}
            src={icon.img}
            alt=""
            width={icon.width}
            height={icon.height}
            style={{
              top: icon.top,
              left: icon.left,
              right: icon.right,
              width: icon.width,
              height: icon.height,
            }}
            className="absolute"
          />
        ))}
      </div>
    </section>
  );
}