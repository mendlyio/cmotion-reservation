import Image from "next/image";

export function DisneyBanner({ compact = false }: { compact?: boolean }) {
  return (
    <figure className="w-full">
      <Image
        src="/disney-affiche.jpg"
        alt="CMotion Studio présente Disney Show, 5 et 6 décembre 2026, Centre culturel Spa"
        width={1024}
        height={1536}
        priority={!compact}
        className={
          compact
            ? "w-full max-h-52 rounded-xl object-cover object-top shadow-lg shadow-black/40"
            : "w-full h-auto rounded-2xl shadow-xl shadow-black/50"
        }
      />
      <figcaption className="sr-only">
        CMotion Studio présente Disney Show, 5 et 6 décembre 2026, Centre culturel Spa
      </figcaption>
    </figure>
  );
}
