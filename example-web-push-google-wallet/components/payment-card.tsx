import { cn } from "cn";
import { NfcIcon } from "lucide-react";
import Image from "next/image";
import { useId } from "react";
import type { PomeloCardResponse } from "@/lib/pomelo/cards";
import { NetworkLogo } from "@/components/network-logo";

// Visual representation of a Pomelo card: brand color, Pomelo logo, holder
// name, last four digits and network. It never renders the full PAN.
export function PaymentCard({ card }: { card: PomeloCardResponse }) {
  return (
    <div
      className={cn(
        "relative isolate flex aspect-[1.586] w-full flex-col justify-between overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg",
      )}
    >
      <CardPattern />
      <div className="flex items-start justify-between gap-4">
        <Image
          src="/pomelo-logo.svg"
          alt="Pomelo"
          width={96}
          height={32}
          draggable={false}
          className="h-8 w-auto brightness-0 invert"
          style={{ height: "auto" }}
        />
        <NfcIcon aria-hidden className="size-7" />
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="truncate font-semibold tracking-wide uppercase">
            {card.data.name_on_card}
          </span>
          <span className="font-mono text-lg tracking-widest">
            <span aria-hidden="true">•••• </span>
            <span className="sr-only">Terminada en </span>
            {card.data.last_four}
          </span>
        </div>
        <NetworkLogo network={card.data.provider} className="size-16 shrink-0" />
      </div>
    </div>
  );
}

function CardPattern() {
  const patternId = useId();

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 -z-10 size-full opacity-10"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id={patternId}
          width="48"
          height="83.14"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 0 L48 0 L24 41.57 Z M24 41.57 L0 83.14 L48 83.14 Z M0 0 L0 83.14 M48 0 L48 83.14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
