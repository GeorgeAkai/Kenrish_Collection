export interface Product {
  id: number
  name: string
  price: string
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
  description: string
  image: string | null
  average_rating: number
  stock_quantity: number
  reorder_level: number
  cost_price?: string
  created_at?: string
  updated_at?: string
}

export interface Clothes {
  id: number
  name: string
  price: string
  description: string
  image: string | null
  average_rating: number
  stock_quantity: number
  reorder_level: number
  cost_price?: string
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
  title: string
  description: string
  discount_percentage: string
  image: string | null
  valid_until: string | null
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
}

export interface InventoryItem {
  id: number
  name: string
  item_type: 'product' | 'handbag' | 'clothes'
  stock_quantity: number
  reorder_level: number
  cost_price: string
  price: string
  is_low_stock: boolean
  inventory_value: string
}

export interface Expense {
  id: number
  description: string
  amount: string
  category: string
  created_at: string
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
