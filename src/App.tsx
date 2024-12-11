import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import Drivers from './pages/Drivers';
import Profile from './pages/Profile';
import TestAirtable from './pages/TestAirtable';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="profile" element={<Profile />} />
        <Route path="test" element={<TestAirtable />} />
      </Route>
    </Routes>
  );
};

export default App;