// PDAX integration types — mirror of backend/app/pdax/models.
// Domain: shared + trade (price, quote, order).

export type PdaxSide = "buy" | "sell";

export type PdaxEnvironment = {
  environment: string;
  base_url: string;
  configured: boolean;
};

export type PdaxQuote = {
  quote_id?: string | null;
  expires_at?: string | null;
  quote_currency: string;
  base_currency: string;
  side: PdaxSide;
  base_quantity: number;
  price: number;
  total_amount: number;
};

export type PdaxFirmQuoteRequest = {
  quote_currency: string;
  base_currency?: string;
  side: PdaxSide;
  base_quantity: string;
};

export type PdaxFirmQuoteV2Request = {
  side: PdaxSide;
  quote_currency: string;
  base_currency?: string;
  currency: string;
  quantity: string;
};

export type PdaxOrderRequest = {
  quote_id: string;
  side: PdaxSide;
  idempotency_id: string;
};

export type PdaxOrder = {
  order_id: number;
  status: string;
  quote_currency: string;
  base_currency: string;
  side: PdaxSide;
  base_quantity: number;
  price: number;
  total_amount: number;
  created_at?: string | null;
  updated_at?: string | null;
};
