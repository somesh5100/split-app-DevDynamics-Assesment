import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import api from '../api/api';
import SplitRow from './SplitRow';

const defaultSplit = { name: '', splitType: 'equal', value: 0 };

export default function ExpenseForm() {
  const { register, control, handleSubmit, reset } = useForm({
    defaultValues: {
      amount: '',
      description: '',
      paid_by: '',
      category: 'Other',
      split: [defaultSplit],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'split',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      data.amount = Number(data.amount);
      data.split = data.split.map(s => ({
        ...s,
        value: Number(s.value),
      }));
      await api.post('/expenses', data);
      setMessage('✅ Expense added successfully!');
      reset();
    } catch (err) {
      console.error(err);
      setMessage('❌ Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl mx-auto bg-white shadow-md rounded-lg p-6 space-y-6"
    >
      <h2 className="text-2xl font-bold text-indigo-600">➕ Add Expense</h2>

      {/* Amount */}
      <div>
        <label className="block font-medium text-gray-700">Amount</label>
        <input
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          required
          className="w-full mt-1 px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block font-medium text-gray-700">Description</label>
        <input
          type="text"
          {...register('description')}
          required
          className="w-full mt-1 px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Paid By */}
      <div>
        <label className="block font-medium text-gray-700">Paid By</label>
        <input
          type="text"
          {...register('paid_by')}
          required
          className="w-full mt-1 px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block font-medium text-gray-700">Category</label>
        <select
          {...register('category')}
          required
          className="w-full mt-1 px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="Rent">Rent</option>
          <option value="Food">Food</option>
          <option value="Travel">Travel</option>
          <option value="Utilities">Utilities</option>
          <option value="Groceries">Groceries</option>
          <option value="Entertainment">Entertainment</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Split Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Split Among</h3>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <SplitRow
              key={field.id}
              index={index}
              register={register}
              remove={remove}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => append(defaultSplit)}
          className="mt-3 text-sm text-indigo-600 hover:underline"
        >
          + Add Person
        </button>
      </div>

      {/* Submit */}
      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-md shadow hover:bg-indigo-700 transition"
        >
          {loading ? 'Saving...' : 'Add Expense'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <p className="text-sm mt-2 text-center text-gray-700">{message}</p>
      )}
    </form>
  );
}
