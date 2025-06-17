import React, { useEffect, useState } from 'react';
import api from '../api/api';

export default function CategorySpendingsSection() {
  const [data, setData] = useState({ total: 0, breakdown: [] });

  useEffect(() => {
    api.get('/category-expenses').then(res => setData(res.data));
  }, []);

  return (
    <div>
      <p>Total: ₹{data.total}</p>
      <ul>
        {data.breakdown.map((cat, idx) => (
          <li key={idx}>
            {cat.category}: ₹{cat.total} ({cat.percentage}%)
          </li>
        ))}
      </ul>
    </div>
  );
}
