import React, { useState } from 'react';
import BalancesSection from '../components/BalanceSection';
import PeopleSection from '../components/PeopleSection';
import SettlementsSection from '../components/SettlementSection';
import CategorySpendingsSection from '../components/CategorySpendingSection';
import MonthlySpendingsSection from '../components/MonthlySpendings';
import { useNavigate } from 'react-router-dom';

function ToggleSection({ title, children }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-6 border border-gray-200 rounded-lg shadow-sm bg-white">
      {/* Toggle Section Header */}
      <div
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center px-6 py-4 bg-gray-100 hover:bg-gray-200 cursor-pointer"
      >
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
        <span className="text-gray-500 text-xl">{open ? '−' : '+'}</span>
      </div>

      {/* Content */}
      {open && <div className="p-6">{children}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-indigo-600 mb-4 drop-shadow-sm">
          💼 Expense Dashboard
        </h1>

        {/* One Add Expense Button for Entire Page */}
        <div className="flex justify-center mb-10">
          <button
            onClick={() => navigate('/add-expense')}
            className="px-6 py-2 bg-indigo-600 text-white text-sm rounded-lg shadow hover:bg-indigo-700 transition"
          >
            ➕ Add New Expense
          </button>
        </div>

        <ToggleSection title="💰 Balances">
          <BalancesSection />
        </ToggleSection>

        <ToggleSection title="👥 People">
          <PeopleSection />
        </ToggleSection>

        <ToggleSection title="🤝 Settlements">
          <SettlementsSection />
        </ToggleSection>

        <ToggleSection title="📊 Category Spendings">
          <CategorySpendingsSection />
        </ToggleSection>

        <ToggleSection title="📆 Monthly Spendings">
          <MonthlySpendingsSection />
        </ToggleSection>
      </div>
    </div>
  );
}
