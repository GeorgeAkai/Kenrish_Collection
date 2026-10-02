export interface Product {
  id: number
  name: string
  price: string
  max_price?: null  // beauty products are single-price; present so shared item cards type-check
  description: string
  image: string | null
  average_rating: number
  stock_quantity: number
  reorder_level: number
  cost_price?: string
  created_at?: string
  updated_at?: string
}

export interface Handbag {
  id: number
  name: string
  price: string
  /** Top of a price range; price is the bottom. null/absent = a single fixed price. */
  max_price?: string | null
  description: string
  image: string | null
  average_rating: number
  stock_quantity: number
  reorder_level: number
  cost_price?: string
  created_at?: string
  updated_at?: string
}

export interface ClothesCategory {
  id: number
  name: string
  slug: string
  sort_order: number
  item_count: number
}

export interface Clothes {
  id: number
  name: string
  price: string
  /** Top of a price range; price is the bottom. null/absent = a single fixed price. */
  max_price?: string | null
  description: string
  image: string | null
  average_rating: number
  stock_quantity: number
  reorder_level: number
  cost_price?: string
  category?: number | null
  category_name?: string | null
  category_slug?: string | null
  size?: string
  color?: string
  created_at?: string
  updated_at?: string
}

export interface Service {
  id: number
  name: string
  short_description: string
  full_description: string
  price: string | null
  price_from: string | null
  price_to: string | null
  image: string | null
}

export interface GalleryImage {
  id: number
  service: string | null
  file: string
  description: string
  uploaded_at: string
  like_count: number
  user_has_liked: boolean
  is_video: boolean
}

export interface Offer {
  id: number
  name: string
  description: string
  offer_price: string
  image: string | null
  created_at: string
}

export interface Wishlist {
  products: Product[]
  handbags: Handbag[]
  clothes: Clothes[]
}

export interface Sale {
  id: number
  item_name: string
  item_type: 'product' | 'handbag' | 'clothes'
  quantity: number
  unit_price: string
  total_amount: string
  customer_name: string
  customer_phone: string
  created_at: string
  created_by_username: string
  edited: boolean
  edit_count: number
}

export interface InventoryItem {
  id: number
  name: string
  item_type: 'product' | 'handbag' | 'clothes'
  stock_quantity: number
  reorder_level: number
  cost_price: string
  price: string
  max_price: string | null
  is_low_stock: boolean
  inventory_value: string
}

export interface Expense {
  id: number
  description: string
  /** null = a recurring bill still awaiting its amount */
  amount: string | null
  category: string
  /** null = shared between both shops */
  shop: 'beauty' | 'fashion' | null
  /** YYYY-MM-DD, when the money was spent */
  date_purchased: string
  note: string
  is_pending: boolean
  recurring: number | null
  created_at: string
}

export interface RecurringExpense {
  id: number
  name: string
  category: string
  shop: 'beauty' | 'fashion' | null
  kind: 'fixed' | 'variable'
  amount: string | null
  start_date: string
  active: boolean
}

export interface Employee {
  id: number
  name: string
  phone: string
  email: string
  start_date: string
  /** last working day; null = still employed */
  end_date: string | null
  monthly_salary: string
  shop: 'beauty' | 'fashion' | 'both'
  schedule: import('./schedule').Schedule
  off_days: import('./schedule').Day[]
  is_active: boolean
  works_today: boolean
  created_at: string
}

export interface EmployeeShiftCard {
  id: number
  name: string
  shop: Employee['shop']
  shift: import('./schedule').Shift | null
}

export interface EmployeeDashboard {
  on_shift_today: EmployeeShiftCard[]
  off_today: EmployeeShiftCard[]
  total_monthly_payroll: string
  headcount: { beauty: number; fashion: number; both: number; total: number }
}

export interface CustomerRow {
  /** 'customer:12' (has a customer record) or 'user:5' (registered, never bought) */
  ref: string
  kind: 'registered' | 'walkin'
  name: string
  username: string | null
  phone: string
  user_id: number | null
  spend: string
  purchases: number
  /** YYYY-MM-DD */
  last_purchase: string | null
  /** A registered user whose profile phone matches this walk-in; an admin must confirm the link */
  possible_user: { id: number; username: string } | null
}

export interface TimelineEvent {
  type: 'sale' | 'service' | 'order' | 'reservation' | 'rating'
  /** ISO datetime */
  date: string
  title: string
  detail: string
  amount: string | null
}

export interface CustomerProfile {
  ref: string
  kind: 'registered' | 'walkin'
  name: string
  username: string | null
  email: string
  joined: string | null
  phone: string
  user_id: number | null
  /** null when a registered user has never bought anything (no record to edit or audit) */
  customer_id: number | null
  possible_user: { id: number; username: string } | null
  metrics: {
    total_spend: string
    purchases: number
    average_purchase: string
    last_purchase: string | null
    /** null for walk-ins (no account) */
    logins: number | null
    last_seen: string | null
  }
  /** Dated login detail; null for walk-ins. `logins` above is the older lifetime total. */
  login_stats: { last_30_days: number; web: number; app: number; tracked_since: string | null } | null
  spend_by_month: { month: string; spend: string }[]
  timeline: TimelineEvent[]
  /** null for walk-ins (no account) */
  wishlist: { type: 'product' | 'handbag' | 'clothes'; id: number; name: string; price: string }[] | null
}

export interface ExpenseList {
  results: Expense[]
  count: number
  total: string
  pending_count: number
}

export interface AdminUser {
  id: number
  username: string
  email: string
  is_staff: boolean
  date_joined: string
  last_login: string | null
  login_count: number
  added_by: string | null
  has_wishlist: boolean
}

export interface InvoiceItem {
  id: number
  item_type: 'product' | 'handbag' | 'clothes'
  item_name: string
  quantity: number
  unit_price: string
  subtotal: string
}

export interface Invoice {
  id: number
  invoice_number: string
  customer_name: string
  customer_phone: string
  created_at: string
  grand_total: string
  created_by_username: string
  items?: InvoiceItem[]
}

export interface AnalyticsSummary {
  revenue: number
  cost: number
  profit: number
  sales_count: number
  total_expenses: number
  net_cash_flow: number
}

export interface SalesTrend {
  period: string
  revenue: number
  profit: number
  count: number
}

export interface TopSeller {
  name: string
  item_type: string
  total_sold: number
  total_revenue: number
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface SlotConfiguration {
  id: number
  service: number
  service_name: string
  worker_count: number
  slot_duration_minutes: number
  start_time: string   // HH:MM:SS
  end_time: string
  active_days: number[] // 0=Mon … 6=Sun
  is_active: boolean
  updated_at: string
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

export interface OrderItem {
  id: number
  item_type: 'product' | 'handbag' | 'clothes'
  item_name: string
  quantity: number
  unit_price: string
  subtotal: string
}

export interface Order {
  id: number
  customer_username: string
  status: OrderStatus
  status_display: string
  total_amount: string
  notes: string
  admin_notes: string
  created_at: string
  items: OrderItem[]
}

export type ReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface Reservation {
  id: number
  service: number | null
  service_name: string | null
  reservation_date: string   // YYYY-MM-DD
  reservation_time: string   // HH:MM:SS
  notes: string
  status: ReservationStatus
  status_display: string
  admin_notes: string
  customer_username: string
  customer?: number
  customer_display?: string
  created_at: string
}
