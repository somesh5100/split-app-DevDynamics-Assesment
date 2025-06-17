import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ExpensePage from './pages/ExpensePage';
import DashboardPage from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/add-expense" element={<ExpensePage />} />
      </Routes>
    </Router>
  );
}

export default App;
