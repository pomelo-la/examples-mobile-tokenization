import { PaymentCard } from "@/components/payment-card";
import type { MyCard } from "@/lib/pomelo/cards";

const MOCK_CARDS: MyCard[] = [
  { id: "crd-1", lastFour: "4242", provider: "VISA" },
  { id: "crd-2", lastFour: "5555", provider: "MASTERCARD" },
];

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-12 pb-32">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-4xl font-bold tracking-tight">Mis tarjetas</h1>
        {MOCK_CARDS.map((card) => (
          <PaymentCard key={card.id} card={card} holderName="Ada Lovelace" />
        ))}
      </div>
    </div>
  );
}
