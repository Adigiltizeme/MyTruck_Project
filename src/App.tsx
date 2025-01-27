import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import Drivers from './pages/Drivers';
import Profile from './pages/Profile';
import TestAirtable from './pages/TestAirtable';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/Home';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route path="/login" element={<Login />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-airtable"
          element={
            <ProtectedRoute>
              <TestAirtable />
            </ProtectedRoute>
          }
        />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
};

export default App;