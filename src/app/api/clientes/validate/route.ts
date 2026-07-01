import { NextResponse } from "next/server";
import { getStorage } from "@/services/storage";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("cliente_id")?.trim();
  if (!id) {
    return NextResponse.json(
      { error: "cliente_id é obrigatório." },
      { status: 400 },
    );
  }
  try {
    const cliente = await getStorage().getClienteById(id);
    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ cliente });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao validar cliente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
