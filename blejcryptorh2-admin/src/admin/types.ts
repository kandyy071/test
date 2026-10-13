export interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  social_handle: string | null;
  crypto_type: string;
  mode: 'buy' | 'sell';
  cash_amount_eur: number;
  crypto_amount: number;
  fee_percentage: number;
  fee_amount_eur: number;
  fee_mode: 'included' | 'extra';
  net_amount_eur: number;
  crypto_price_eur: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  preferred_date: string;
  preferred_time: string;
  meeting_location: string | null;
  notes: string | null;
  created_at: string;
}

export const APPOINTMENT_STATUSES: Appointment['status'][] = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
];

export const APPOINTMENT_STATUS_LABELS: Record<Appointment['status'], string> = {
  pending: 'Në pritje',
  confirmed: 'Konfirmuar',
  completed: 'Përfunduar',
  cancelled: 'Anuluar',
};

export interface CryptoSwapRow {
  id: string;
  swap_id: string;
  customer_name: string;
  customer_phone: string;
  send_coin: string;
  send_network: string;
  send_amount: number;
  receive_coin: string;
  receive_network: string;
  receive_amount: number;
  exchange_rate: number;
  exchange_fee_pct: number;
  coin_fee_pct: number;
  customer_receiving_address: string;
  deposit_address: string | null;
  deposit_network: string | null;
  transaction_hash: string | null;
  status: 'waiting' | 'detected' | 'confirming' | 'processing' | 'completed' | 'expired' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export const SWAP_STATUSES: CryptoSwapRow['status'][] = [
  'waiting',
  'detected',
  'confirming',
  'processing',
  'completed',
  'expired',
  'cancelled',
];

export const SWAP_STATUS_LABELS_SQ: Record<CryptoSwapRow['status'], string> = {
  waiting: 'Duke pritur pagesën',
  detected: 'Pagesa u detektua',
  confirming: 'Duke konfirmuar',
  processing: 'Duke procesuar',
  completed: 'U kompletua',
  expired: 'Skadoi',
  cancelled: 'U anulua',
};

export interface ChatMessageRow {
  id: string;
  session_id: string;
  sender: 'user' | 'support';
  message: string;
  created_at: string;
}
