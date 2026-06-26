// PDAX integration types — mirror of backend/app/pdax/models.
// Domain: shared + trade (price, quote, order).

export type PdaxSide = "buy" | "sell";

export type PdaxEnvironment = {
  environment: string;
  base_url: string;
  configured: boolean;
};

export type PdaxHealth = {
  status: "ok" | "degraded" | "unconfigured";
  environment: string;
  reason?: string;
  code?: string | number | null;
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

// Domain: ramp orchestration (PHP <-> USDCXLM).

export type RampDirection = "onramp" | "offramp";

export type RampStatus =
  | "quoted"
  | "awaiting_payment"
  | "funded"
  | "converting"
  | "settling"
  | "completed"
  | "failed";

export type PdaxRampEstimate = {
  direction: RampDirection;
  php_amount: number;
  usdc_amount: number;
  price: number;
  quote_currency: string;
  base_currency: string;
};

export type PdaxFundingQuote = {
  usdc_target: number;
  php_to_pay: number;
  php_base: number;
  buffer_bps: number;
  price: number;
};

export type PdaxRampStage = {
  name: string;
  status: string;
  detail: string;
};

export type PdaxRampRecord = {
  ramp_id: string;
  direction: RampDirection;
  status: RampStatus;
  created_at: string;
  php_amount: number;
  usdc_amount: number;
  price: number;
  stellar_address?: string | null;
  deposit_address?: string | null;
  deposit_tag?: string | null;
  identifier?: string | null;
  reference_number?: string | null;
  checkout_url?: string | null;
  order_id?: number | null;
  crypto_tx_id?: number | null;
  withdraw_request_id?: string | null;
  stages: PdaxRampStage[];
  error?: string | null;
};

export type PdaxOnRampRequest = {
  php_amount: string;
  stellar_address: string;
  method: string;
  identifier: string;
  sender_first_name: string;
  sender_last_name: string;
  beneficiary_first_name: string;
  beneficiary_last_name: string;
};

export type PdaxOffRampRequest = {
  usdc_amount: string;
  identifier: string;
  beneficiary_bank_code: string;
  beneficiary_account_name: string;
  beneficiary_account_number: string;
  sender_first_name: string;
  sender_last_name: string;
  beneficiary_first_name: string;
  beneficiary_last_name: string;
};
