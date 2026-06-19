import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Devices from '@/pages/Devices'
import DeviceDetail from '@/pages/DeviceDetail'
import Reservations from '@/pages/Reservations'
import Queue from '@/pages/Queue'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/devices/:id" element={<DeviceDetail />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/queue" element={<Queue />} />
        </Route>
      </Routes>
    </Router>
  )
}
