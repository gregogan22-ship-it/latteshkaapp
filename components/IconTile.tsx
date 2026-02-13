"use client";
import Link from "next/link";
import type { Route } from "next";
import type { UrlObject } from "url";

type Props = {
  title: string;
  href?: string | UrlObject;
  onClick?: () => void;
  // Tailwind классы для градиента/цвета
  tone?: string; // например: "from-pink-500 to-rose-500"
  icon: React.ReactNode;
};

const asRoute = (s: string) => s as unknown as Route;

export default function IconTile({
  title,
  href,
  onClick,
  tone = "from-sky-500 to-blue-600",
  icon,
}: Props) {
  const classes =
    "border rounded-2xl p-4 bg-white hover:shadow-md transition flex items-center gap-3";
  const badge = "rounded-xl p-2 text-white bg-gradient-to-br " + tone;

  const inner = (
    <>
      <div className={badge}>{icon}</div>
      <div className="font-medium">{title}</div>
    </>
  );

  return href ? (
    <Link
      href={typeof href === "string" ? asRoute(href) : (href as UrlObject)}
      className={classes}
    >
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={classes + " w-full text-left"}>
      {inner}
    </button>
  );
}
