import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Deals from './pages/Deals';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderStatus from './pages/OrderStatus';
import Admin from './pages/Admin';
import Help from './pages/Help';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/checkout/:packageId" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/order/:orderNumber" element={<OrderStatus />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/help" element={<Help />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
