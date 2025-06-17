import React, { useEffect, useState } from 'react';
import api from '../api/api';

export default function SettlementsSection() {
  const [settlements, setSettlements] = useState([]);

  useEffect(() => {
    api.get('/settlements').then(res => setSettlements(res.data.settlements));
  }, []);

  return (
    <ul>
      {settlements.map((s, idx) => (
        <li key={idx}>{s.from} pays ₹{s.amount} to {s.to}</li>
      ))}
    </ul>
  );
}
