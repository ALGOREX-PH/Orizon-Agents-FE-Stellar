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

// Domain: funding (crypto deposit address, fiat deposit) + balances.

export type PdaxBalance = {
  currency: string;
  available: string;
  hold: string;
  total: string;
  asset_type: string;
};

export type PdaxCryptoDepositAddress = {
  currency: string;
  address: string;
  tag?: string | null;
};

export type PdaxFiatDepositResult = {
  request_id: string;
  identifier: string;
  reference_number: string;
  amount: number;
  method: string;
  payment_checkout_url: string;
  fee: number;
  status: string;
};

// Domain: withdrawals (fiat, crypto out).

export type PdaxRetryMethod = {
  request_id: string;
  channel: string;
  status: string;
  fail_reason: string;
  time?: string | null;
};

export type PdaxFiatWithdrawResult = {
  request_id?: string | null;
  identifier: string;
  reference_number?: string | null;
  amount: number;
  method: string;
  retry_methods: PdaxRetryMethod[];
  status: string;
  fee: number;
};

export type PdaxCryptoOutResult = {
  identifier: string;
  transaction_id: number;
  transaction_hash: string;
  amount: string;
  address: string;
  tag?: string | null;
  total: string;
  fee: string;
  currency: string;
  status: string;
  created_at?: string | null;
};

// Domain: transaction history + reference tables.

export type PdaxFiatTransaction = {
  request_id: string;
  transaction_id: number;
  amount: string;
  fee?: string | null;
  method: string;
  mode: string;
  reference_number: string;
  fulfilled_at?: string | null;
  declined_at?: string | null;
  rejection_reason?: string | null;
  currency: string;
  created_at?: string | null;
  updated_at?: string | null;
  status: string;
  identifier: string;
  fee_type?: string | null;
  retried_methods: PdaxRetryMethod[];
};

export type PdaxCryptoTransaction = {
  transaction_id: number;
  type: string;
  credit_ccy?: string | null;
  debit_ccy?: string | null;
  credit_amount: string;
  debit_amount: string;
  fee_amount: string;
  status: string;
  created_at?: string | null;
  txn_hash?: string | null;
  identifier?: string | null;
};

export type PdaxReference = {
  source_of_funds: string[];
  purpose: string[];
  relationship: string[];
  fee_type: string[];
  sex: string[];
  fiat_deposit_methods: Record<string, string>;
  fiat_withdrawal_methods: string[];
  travel_rule_threshold_php: number;
};
