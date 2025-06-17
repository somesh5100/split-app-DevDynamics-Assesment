import React, { useEffect, useState } from 'react';
import api from '../api/api';

export default function PeopleSection() {
  const [people, setPeople] = useState([]);

  useEffect(() => {
    api.get('/people').then(res => setPeople(res.data.data || []));
  }, []);

  return (
    <ul>
      {people.map(person => <li key={person.id}>{person.name}</li>)}
    </ul>
  );
}
