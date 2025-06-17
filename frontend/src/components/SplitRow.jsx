import React from 'react';

export default function SplitRow({ index, register, remove }) {
  return (
    <div className="split-row">
      <input
        type="text"
        placeholder="Name"
        {...register(`split.${index}.name`)}
        required
      />
      <select {...register(`split.${index}.splitType`)}>
        <option value="equal">Equal</option>
        <option value="percentage">Percentage</option>
        <option value="exact">Exact</option>
      </select>
      <input
        type="number"
        step="0.01"
        placeholder="Value"
        {...register(`split.${index}.value`, { valueAsNumber: true })}
      />
      <button type="button" onClick={() => remove(index)}>Remove</button>
    </div>
  );
}
