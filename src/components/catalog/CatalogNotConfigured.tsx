export function CatalogNotConfigured() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-black text-slate-900">
          Catálogo ainda não configurado.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          A integração com o Bling ainda não foi conectada. Configure a variável{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">
            BLING_API_ACCESS_TOKEN
          </code>{" "}
          no ambiente do servidor para exibir os produtos sincronizados.
        </p>
      </div>
    </div>
  );
}
