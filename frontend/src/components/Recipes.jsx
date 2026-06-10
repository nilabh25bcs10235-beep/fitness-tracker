export default function Recipes({ data, loading, onRefresh }) {
  if (loading) return <div className="card">Generating recipes...</div>;
  if (!data) return (
    <div className="card">
      <p>No recipes yet.</p>
      <button className="btn btn-primary" onClick={onRefresh}>Get AI Recipes</button>
    </div>
  );

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Recipe Suggestions</h2>
          <button className="btn btn-secondary" onClick={onRefresh}>Refresh</button>
        </div>
        <p style={{ color: 'var(--muted)' }}>
          Indian non-veg, dairy-free recipes tailored to your goals.
        </p>
        {data.ai_notes && (
          <div className="insight-box">{data.ai_notes}</div>
        )}
      </div>

      {data.recipes.map((r, i) => (
        <div key={i} className="recipe-card">
          <h3>{r.name}</h3>
          <p style={{ color: 'var(--muted)' }}>{r.description}</p>
          <div className="chip-row">
            <span className="chip">{r.calories} kcal</span>
            <span className="chip">{r.protein_g}g protein</span>
            <span className="chip">{r.prep_time_min} min</span>
            {r.tags?.map((t) => <span key={t} className="badge">{t}</span>)}
          </div>
          <details style={{ marginTop: '0.75rem' }}>
            <summary style={{ cursor: 'pointer' }}>Ingredients & Steps</summary>
            <strong>Ingredients:</strong>
            <ul>{r.ingredients.map((ing, j) => <li key={j}>{ing}</li>)}</ul>
            <strong>Instructions:</strong>
            <ol>{r.instructions.map((step, j) => <li key={j}>{step}</li>)}</ol>
          </details>
        </div>
      ))}

      <div className="card">
        <h3>Grocery List</h3>
        <ul className="grocery-list">
          {data.grocery_list.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}