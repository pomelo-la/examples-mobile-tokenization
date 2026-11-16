// Client-safe card model shared by the UI. It only carries what the demo
// renders: never the PAN, CVV or expiration date.

export type CardProvider = "VISA" | "MASTERCARD";

export interface MyCard {
  id: string;
  lastFour: string;
  provider: CardProvider;
}
