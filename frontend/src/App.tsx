import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute, AdminRoute } from '@/components/RouteGuards'
import PublicLayout from '@/layouts/PublicLayout'
import AdminLayout from '@/layouts/AdminLayout'
import ChatbotWidget from '@/components/ChatbotWidget'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import SignupPage from '@/pages/auth/SignupPage'
import ChangePasswordPage from '@/pages/auth/ChangePasswordPage'

// Public
import HomePage from '@/pages/public/HomePage'
import ProductsPage from '@/pages/public/ProductsPage'
import ProductDetailPage from '@/pages/public/ProductDetailPage'
import HandbagsPage from '@/pages/public/HandbagsPage'
import HandbagDetailPage from '@/pages/public/HandbagDetailPage'
import ClothesPage from '@/pages/public/ClothesPage'
import ClothesDetailPage from '@/pages/public/ClothesDetailPage'
import ServicesPage from '@/pages/public/ServicesPage'
import GalleryPage from '@/pages/public/GalleryPage'
import OffersPage from '@/pages/public/OffersPage'
import AboutPage from '@/pages/public/AboutPage'
import WishlistPage from '@/pages/public/WishlistPage'
import OrdersPage from '@/pages/public/OrdersPage'
import ReservationPage from '@/pages/public/ReservationPage'

// Admin
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminProductsPage from '@/pages/admin/AdminProductsPage'
import AdminHandbagsPage from '@/pages/admin/AdminHandbagsPage'
import AdminClothesPage from '@/pages/admin/AdminClothesPage'
import AdminInventoryPage from '@/pages/admin/AdminInventoryPage'
import AdminServicesPage from '@/pages/admin/AdminServicesPage'
import AdminGalleryPage from '@/pages/admin/AdminGalleryPage'
import AdminOffersPage from '@/pages/admin/AdminOffersPage'
import AdminUsersPage from '@/pages/admin/AdminUsersPage'
import AdminInvoicesPage from '@/pages/admin/AdminInvoicesPage'
import AdminReservationsPage from '@/pages/admin/AdminReservationsPage'
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage'
import AdminSlotConfigPage from '@/pages/admin/AdminSlotConfigPage'

const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
    <p className="text-muted-foreground mt-2 mb-6">Page not found</p>
    <a href="/" className="text-primary hover:underline">← Back to home</a>
  </div>
)

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/handbags" element={<HandbagsPage />} />
          <Route path="/handbags/:id" element={<HandbagDetailPage />} />
          <Route path="/clothes" element={<ClothesPage />} />
          <Route path="/clothes/:id" element={<ClothesDetailPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy-policy" element={<div className="max-w-3xl mx-auto px-4 py-10"><h1 className="text-2xl font-bold mb-4">Privacy Policy</h1><p className="text-muted-foreground">We respect your privacy. Your personal information is collected only to process orders and improve your experience. We do not sell your data to third parties.</p></div>} />
          <Route path="/terms-of-service" element={<div className="max-w-3xl mx-auto px-4 py-10"><h1 className="text-2xl font-bold mb-4">Terms of Service</h1><p className="text-muted-foreground">By using Kenrish Collection, you agree to our terms. All sales are final unless goods are defective. Contact us at 0708440390 for any issues.</p></div>} />
          <Route path="/reservation" element={<ReservationPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
          </Route>
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/handbags" element={<AdminHandbagsPage />} />
            <Route path="/admin/clothes" element={<AdminClothesPage />} />
            <Route path="/admin/inventory" element={<AdminInventoryPage />} />
            <Route path="/admin/services" element={<AdminServicesPage />} />
            <Route path="/admin/gallery" element={<AdminGalleryPage />} />
            <Route path="/admin/offers" element={<AdminOffersPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/invoices" element={<AdminInvoicesPage />} />
            <Route path="/admin/reservations" element={<AdminReservationsPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/slot-config" element={<AdminSlotConfigPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <ChatbotWidget />
    </AuthProvider>
    </ThemeProvider>
  )
}
