import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/auth-provider";
import AdminLayout from "./components/layout/AdminLayout";
import { Toaster } from "@/components/ui/sonner";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import ProductsList from "./pages/products/ProductsList";
import EditProduct from "./pages/products/EditProduct";
import CollectionsList from "./pages/collections/CollectionsList";
import EditCollection from "./pages/collections/EditCollection";
import CategoriesList from "./pages/categories/CategoriesList";
import EditCategory from "./pages/categories/EditCategory";
import HomepageManager from "./pages/homepage/HomepageManager";
import CampaignsList from "./pages/campaigns/CampaignsList";
import EditCampaign from "./pages/campaigns/EditCampaign";
import OrdersList from "./pages/orders/OrdersList";
import CustomersList from "./pages/customers/CustomersList";
import ReviewsList from "./pages/reviews/ReviewsList";
import Settings from "./pages/settings/Settings";

// We'll add the other modules step by step as requested

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<ProductsList />} />
            <Route path="/products/new" element={<EditProduct />} />
            <Route path="/products/:id" element={<EditProduct />} />

            <Route path="/collections" element={<CollectionsList />} />
            <Route path="/collections/new" element={<EditCollection />} />
            <Route path="/collections/:id" element={<EditCollection />} />

            <Route path="/categories" element={<CategoriesList />} />
            <Route path="/categories/new" element={<EditCategory />} />
            <Route path="/categories/:id" element={<EditCategory />} />

            <Route path="/homepage" element={<HomepageManager />} />

            <Route path="/campaigns" element={<CampaignsList />} />
            <Route path="/campaigns/new" element={<EditCampaign />} />
            <Route path="/campaigns/:id" element={<EditCampaign />} />

            <Route path="/orders" element={<OrdersList />} />
            <Route path="/customers" element={<CustomersList />} />
            <Route path="/reviews" element={<ReviewsList />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </Router>
  );
}
