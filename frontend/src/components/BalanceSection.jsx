import React, { useEffect, useState } from 'react';
import api from '../api/api';

export default function BalancesSection() {
  const [balances, setBalances] = useState([]);

  useEffect(() => {
    api.get('/balances').then(res => setBalances(res.data.data));
  }, []);

  return (
    <ul className="space-y-2">
    {balances.map((p, i) => (
      <li key={i} className="flex justify-between text-sm text-gray-800">
        <span className="font-medium">{p.name}</span>
        <span>
          Paid: ₹{p.paid} | Owes: ₹{p.owes} | <b className={`${p.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>Balance: ₹{p.balance}</b>
        </span>
      </li>
    ))}
  </ul>
  );
}
