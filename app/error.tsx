"use client";

import { AlertCircle, RotateCw } from "lucide-react";

export default function ErrorPage() {
  return (
    <div className="page-container">
      <div className="surface empty-state" role="alert">
        <AlertCircle size={32} />
        <h1 className="section-title mb-3">
          Não foi possível carregar esta página
        </h1>
        <p>
          Verifique sua conexão e tente novamente. Se o problema continuar,
          entre em contato com a secretaria.
        </p>
        <button
          className="button button-primary"
          onClick={() => window.location.reload()}
        >
          <RotateCw size={16} /> Tentar novamente
        </button>
      </div>
    </div>
  );
}
