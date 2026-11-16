import { connection } from "next/server";
import { Suspense } from "react";
import { PaymentCard } from "@/components/payment-card";
import { getCard } from "@/lib/pomelo/cards";

async function CardSection() {
  // Card data is request-time data: fetch it inside <Suspense> so the route
  // can prerender the shell and stream the card in.
  await connection();

  const cardId = process.env.POMELO_CARD_ID;

  if (!cardId) {
    return (
      <p className="text-muted-foreground">
        Configurá la variable de entorno POMELO_CARD_ID para ver tu tarjeta.
      </p>
    );
  }

  const card = await getCard(cardId);

  return <PaymentCard card={card} />;
}

function CardSkeleton() {
  return (
    <div
      aria-hidden
      className="aspect-[1.586] w-full animate-pulse rounded-3xl bg-muted"
    />
  );
}

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-12 pb-32">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-4xl font-bold tracking-tight">Mis tarjetas</h1>
        <Suspense fallback={<CardSkeleton />}>
          <CardSection />
        </Suspense>
      </div>
    </div>
  );
}
