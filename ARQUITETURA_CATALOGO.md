# Arquitetura — Catálogo Online V1

Documento oficial de regras do projeto. Toda implementação deve respeitar este escopo.

---

## Objetivo do produto

O **Catálogo Online** é um módulo com **duas responsabilidades**:

1. **Exibir produtos** sincronizados com o **Bling** (única fonte de verdade).
2. **Transformar o carrinho** do visitante em uma **Solicitação de Orçamento** estruturada.

Após gerar a solicitação, **o trabalho do Catálogo termina**.

O Catálogo **não sabe** o que será feito com essa solicitação (Excel, PDF, API, webhook, agentes, ERP, etc.).

---

## O que este projeto NÃO é

- Não é e-commerce (sem checkout, pagamento, frete, cupom).
- Não é ERP (não cadastra produtos, não altera estoque/preços no Bling).
- Não é CRM.
- Não é sistema de agentes ou IA.
- Não envia WhatsApp.
- Não cria orçamento ou pedido no Bling.

---

## Princípio fundamental: Bling como fonte de verdade

| Regra | Descrição |
|-------|-----------|
| Produtos | Sempre lidos do Bling via API v3 |
| Sem mock | Nunca usar dados fictícios ou fallback para mock |
| Sem BD de produtos | O catálogo não possui banco próprio de produtos |
| Não inventar | Categorias, preços, estoque, variantes e imagens vêm do cadastro Bling |
| Não configurado | Sem `BLING_API_ACCESS_TOKEN` → tela "Catálogo ainda não configurado." |

---

## Fluxo principal

```
Bling API v3
    ↓
products.ts (servidor)
    ↓
Páginas Next.js (lista + detalhe)
    ↓
Visitante identifica-se (nome, WhatsApp, e-mail)
    ↓
Monta carrinho (localStorage)
    ↓
Gera Solicitação de Orçamento (API + arquivo JSON)
    ↓
FIM — responsabilidade do Catálogo encerrada
```

---

## Integração com Bling

### Endpoints utilizados

| Método | Endpoint | Uso |
|--------|----------|-----|
| GET | `/produtos` | Listar produtos ativos (paginação completa) |
| GET | `/produtos/{id}` | Detalhe do produto |
| GET | `/produtos/{id}/variacoes` | Variações do produto pai |
| GET | `/estoques/saldos` | Saldos em lote (quando disponível) |

### Dados mapeados do Bling

Nome, código, SKU, GTIN/código de barras, categoria (ID + nome), marca, descrição, fotos, preço, estoque, unidade, peso, situação, variações e atributos.

### Cache

Requisições server-side com `revalidate: 300` (5 minutos).

---

## Regra crítica: identificadores Bling

Toda informação gerada pelo Catálogo deve preservar **IDs oficiais do Bling**.

### Camada visual (humana)

Nome, cor, tamanho, quantidade, preço exibido — para leitura.

### Camada técnica (integrações)

Obrigatória em solicitações e carrinho resolvido:

- `bling_product_id`
- `bling_variant_id`
- `bling_color_id` / `bling_size_id` / `bling_model_id` (quando existirem)
- `bling_attribute_ids`
- `sku`, `codigo`, `barcode`

**Nunca** depender apenas de comparação por nome ou texto.

---

## Identificação do cliente

Não é login. Não há senha, recuperação ou área do cliente.

### Primeira visita

Campos obrigatórios: **Nome**, **WhatsApp**, **E-mail**.  
Opcional: **Empresa**.

Gera `cliente_id` (UUID) persistido em `data/store/clientes.json`.

### Visitas seguintes

Informar apenas **WhatsApp** ou **e-mail** → sistema localiza o cadastro.

Identificação serve para associar solicitações ao visitante, não para autenticação.

---

## Carrinho

- Mantém o nome **"Carrinho"** na interface.
- Persistência: `localStorage` (`catalogo-cart-v3`).
- Funções: adicionar, alterar quantidade, remover, selecionar variantes Bling.
- Cada linha armazena camada técnica resolvida (`resolvedTechnical`).
- Produtos com variações exigem seleção na página do produto.

---

## Solicitação de Orçamento

Gerada via `POST /api/solicitacoes`.

### Estrutura (`src/types/solicitacao.ts`)

| Campo | Descrição |
|-------|-----------|
| `solicitacao_id` | UUID |
| `data` / `hora` | Data/hora da geração |
| `cliente` | Dados do visitante + `cliente_id` |
| `origem` | `"catalogo_online"` |
| `itens[]` | Cada item com `visual` + `tecnico` |
| `observacoes` | Opcional |

Persistência: `data/store/solicitacoes.json`.

O botão no carrinho: **"Gerar solicitação de orçamento"**.

---

## APIs internas do Catálogo

| Método | Rota | Função |
|--------|------|--------|
| POST | `/api/clientes` | Registrar visitante |
| POST | `/api/clientes/lookup` | Localizar por WhatsApp ou e-mail |
| POST | `/api/solicitacoes` | Criar solicitação estruturada |

---

## Estrutura de pastas (V1)

```
src/
  app/                    # Rotas e API routes
  components/             # UI reaproveitada (cards, grid, carrinho, layout)
  contexts/               # Carrinho, filtros, cliente
  lib/                    # Variantes, formatação, builder de solicitação
  services/
    api/                  # Bling client, mapper, products
    storage/              # Persistência clientes/solicitações (não produtos)
  types/                  # catalog, cliente, solicitacao
data/store/               # JSON files (gitignored)
```

---

## Itens que NÃO pertencem ao Catálogo

- Criar orçamento/pedido no Bling
- WhatsApp, e-mail transacional, CRM
- Agentes, IA, automações
- Cadastrar cliente no ERP
- Multi-tenant / multiempresa (fora do escopo V1)
- Wishlist, newsletter, banners promocionais fictícios
- Checkout, pagamento, frete, cupom

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `BLING_API_ACCESS_TOKEN` | Sim | Token OAuth Bling (servidor) |
| `BLING_API_BASE_URL` | Não | Default: `https://api.bling.com.br/Api/v3` |

---

## Evolução futura (fora da V1)

A arquitetura está preparada para que **outros sistemas** consumam solicitações via arquivo, API ou exportação — sem alterar o contrato de `Solicitacao` e dos IDs Bling.

O Catálogo **não implementa** esses consumidores.
