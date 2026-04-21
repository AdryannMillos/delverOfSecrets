import React, { useState } from 'react';

export default function TagInput({ tags = [], onChange }) {
  const [input, setInput] = useState('');

  const add = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput('');
  };

  const remove = (tag) => onChange(tags.filter(t => t !== tag));

  return (
    <div className="tag-input-wrap">
      {tags.map(tag => (
        <span key={tag} className="tag-chip">
          {tag}
          <button onClick={() => remove(tag)} aria-label={`Remove ${tag}`}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        placeholder="Add tag..."
      />
    </div>
  );
}
