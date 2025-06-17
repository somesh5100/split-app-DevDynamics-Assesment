import React, { useEffect, useState } from 'react';
import api from '../api/api';

export default function MonthlySpendingsSection() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/monthly-spendings')
      .then(res => {
        setExpenses(res.data.MonthlyExpenseData || []);
        setCategories(res.data.CategorywiseMonthlyData || []);
      })
      .catch(err => {
        console.error("Failed to fetch monthly spendings", err);
        setExpenses([]);
        setCategories([]);
      });
  }, []);

  return (
    <div>
      <h3>📆 Monthly Expenses</h3>
      <ul>
        {expenses.map(exp => (
          <li key={exp.id}>
            {exp.description} — ₹{exp.amount} ({exp.category})
          </li>
        ))}
      </ul>

      <h3 style={{ marginTop: '2rem' }}>📊 Category-wise Summary</h3>
      <ul>
        {categories.map((cat, idx) => (
          <li key={idx}>
            {cat.category}: ₹{cat._sum.amount}
          </li>
        ))}
      </ul>
    </div>
  );
}
