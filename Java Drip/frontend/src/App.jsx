import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { useEmployee } from './context/EmployeeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CookieBanner from './components/CookieBanner';
import Seo from './components/Seo';
import { getSeoConfig } from './seo/config';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Locations from './pages/Locations';
import About from './pages/About';
import Contact from './pages/Contact';
import Gallery from './pages/Gallery';
import Checkout from './pages/Checkout';
import PaymentReturn from './pages/PaymentReturn';
import OrderConfirmation from './pages/OrderConfirmation';
import Privacy from './pages/Privacy';
import Profile from './pages/Profile';
import SignIn from './pages/SignIn';
import AdminSignIn from './pages/AdminSignIn';
import AdminDashboard from './pages/AdminDashboard';
import Terms from './pages/Terms';

// Scroll to top on every route change so reveal animations trigger correctly
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// Wraps route content with a fade-in animation on each navigation
function AnimatedRoutes() {
  const location = useLocation();
  const seo = getSeoConfig(location.pathname);
  const { loading, isEmployeeSignedIn } = useEmployee();
  return (
    <main key={location.pathname} className="flex-1 page-enter">
      <Seo {...seo} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/admin/signin" element={<AdminSignIn />} />
        <Route
          path="/admin"
          element={
            loading
              ? <div className="min-h-screen bg-surface" />
              : isEmployeeSignedIn
                ? <Navigate to="/admin/orders" replace />
                : <Navigate to="/admin/signin" replace />
          }
        />
        <Route
          path="/admin/orders"
          element={
            loading
              ? <div className="min-h-screen bg-surface" />
              : isEmployeeSignedIn
                ? <AdminDashboard section="orders" />
                : <Navigate to="/admin/signin" replace />
          }
        />
        <Route
          path="/admin/menu"
          element={
            loading
              ? <div className="min-h-screen bg-surface" />
              : isEmployeeSignedIn
                ? <AdminDashboard section="menu" />
                : <Navigate to="/admin/signin" replace />
          }
        />
        <Route
          path="/admin/gallery"
          element={
            loading
              ? <div className="min-h-screen bg-surface" />
              : isEmployeeSignedIn
                ? <AdminDashboard section="gallery" />
                : <Navigate to="/admin/signin" replace />
          }
        />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment-return/:id" element={<PaymentReturn />} />
        <Route path="/order/:id" element={<OrderConfirmation />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <AppShell />
      </CartProvider>
    </BrowserRouter>
  );
}

function AppShell() {
  const location = useLocation();
  const isAdminWorkspaceRoute = location.pathname.startsWith('/admin') && location.pathname !== '/admin/signin';

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <ScrollToTop />
      {!isAdminWorkspaceRoute && <Navbar />}
      <AnimatedRoutes />
      {!isAdminWorkspaceRoute && <Footer />}
      {!isAdminWorkspaceRoute && <CookieBanner />}
    </div>
  );
}
