import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import RestaurantLogin from './pages/restaurant/RestaurantLogin'
import RestaurantDashboard from './pages/restaurant/RestaurantDashboard'
import CustomerApp from './pages/customer/CustomerApp'
import Home from './pages/customer/Home'
import './index.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Restaurant Routes */}
        <Route path="/restaurant" element={<RestaurantLogin />} />
        <Route path="/restaurant/dashboard" element={<RestaurantDashboard />} />

        {/* Customer Route */}
        <Route path="/r/:slug" element={<CustomerApp />} />
      </Routes>
    </Router>
  )
}

export default App
