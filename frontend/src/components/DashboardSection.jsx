export default function DashboardSection({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-gray-700 border-b pb-2 mb-4">{title}</h2>
      <div className="bg-gray-50 p-4 rounded shadow-sm">
        {children}
      </div>
    </section>
  );
}
