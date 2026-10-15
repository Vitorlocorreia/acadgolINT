export default function Loading() {
  return (
    <div
      className="page-container"
      role="status"
      aria-label="Carregando informações"
    >
      <div className="mb-8 h-9 w-52 animate-pulse rounded-lg bg-[var(--bg-subtle)]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="surface h-32 animate-pulse" />
        ))}
      </div>
      <div className="surface mt-6 h-64 animate-pulse" />
      <span className="sr-only">Carregando informações, aguarde.</span>
    </div>
  );
}
