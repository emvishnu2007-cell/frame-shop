import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import SiteLayout from './layouts/SiteLayout';
import { PageLoader } from './components/ui';

import Home from './pages/Home';
import Frames from './pages/Frames';
import FrameDetails from './pages/FrameDetails';
import CustomFrame from './pages/CustomFrame';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import TrackOrder from './pages/TrackOrder';
import { About, Contact, HowItWorks, NotFound } from './pages/Info';

// Admin code is split out so customers never download it.
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminFrames = lazy(() => import('./pages/admin/Frames'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="frames" element={<Frames />} />
          <Route path="frames/:id" element={<FrameDetails />} />
          <Route path="create" element={<CustomFrame />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order-success/:orderId" element={<OrderSuccess />} />
          <Route path="track-order" element={<TrackOrder />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="admin/login" element={<AdminLogin />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="frames" element={<AdminFrames />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
