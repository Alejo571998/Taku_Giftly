# Giftly 🎁

> "No sé qué regalarle" → Taku entiende a esa persona → propone regalos con
> un porqué → busca dónde comprarlos → tu gente vota → tienen ganador.

Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase (Postgres + auth
anónima + Realtime) · OpenAI (recomendaciones) · Mercado Libre (precios).

## Correr en local

```bash
npm install
cp .env.example .env   # completar lo que tengas; todo es opcional
npm run dev
```

Sin keys la app funciona completa: **modo local** (datos en `.data/giftly.json`),
ideas de ejemplo en vez de OpenAI y precios estimados en vez de Mercado Libre.
En desarrollo, la pantalla de resultados indica si las ideas vienen de la IA
real o del mock.

| Variable | Para qué | Sin ella |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Base real, identidad anónima, votación en vivo | Modo local (JSON) |
| `NEXT_PUBLIC_GIFTLY_DATA_MODE=local` | Forzar modo local aunque haya keys (ej: Supabase pausado) | — |
| `OPENAI_API_KEY` | Recomendaciones con IA | Ideas de ejemplo |
| `ML_CLIENT_ID`, `ML_CLIENT_SECRET` | Precio, foto y link reales | Precio estimado (siempre etiquetado) |
| `NEXT_PUBLIC_APP_URL` | URL pública (metadata) | `http://localhost:3000` |

## Migrar Supabase a otra cuenta

El plan gratuito de Supabase permite 2 proyectos activos por cuenta y pausa
los proyectos tras ~7 días sin actividad. Para mover Giftly a una cuenta nueva:

1. **Crear la cuenta y el proyecto** en <https://supabase.com/dashboard> con
   otro email (o una organización nueva). Región sugerida: *South America
   (São Paulo)*. Guardá la contraseña de la base.
2. **Habilitar sesiones anónimas:** *Authentication → Sign In / Providers →
   Allow anonymous sign-ins* → activar. (Sin esto nadie puede entrar a votar.)
3. **Crear el esquema:** *SQL Editor → New query →* pegar
   [`supabase/schema.sql`](supabase/schema.sql) completo *→ Run*. Es
   idempotente: se puede volver a correr sin romper nada.
4. **Copiar las keys:** *Project Settings → API* (o *API Keys*):
   `Project URL`, `anon`/publishable key y `service_role`/secret key.
5. **Actualizar `.env`** con esas tres variables y **borrar la línea**
   `NEXT_PUBLIC_GIFTLY_DATA_MODE=local`. Reiniciar `npm run dev`.
6. **En producción (Vercel):** *Settings → Environment Variables* → reemplazar
   las mismas tres variables → *Redeploy* (las `NEXT_PUBLIC_*` se fijan en el build).
7. **Probar:** generar ideas, crear un grupo, abrir el link en una ventana de
   incógnito, unirse y votar: el ranking tiene que moverse solo en la otra ventana.

**¿Y los datos viejos?** Si eran pruebas, empezá de cero (recomendado). Si
necesitás conservarlos: restaurá el proyecto viejo desde su dashboard (pausando
temporalmente otro para liberar el cupo), exportá con
`npx supabase db dump --data-only -f giftly-data.sql --db-url <conexión-vieja>`
y cargalo en el nuevo con `psql <conexión-nueva> -f giftly-data.sql` después del
paso 3. Los usuarios anónimos no migran: cada navegador obtiene una identidad
nueva, así que "Mis regalos" arranca vacío.

## Arquitectura

```
src/
  app/                 rutas (páginas + API routes)
    api/recommend      IA + búsqueda de productos + scoring → guarda la sesión
    api/groups/...     crear, unirse, votar, cerrar (con desempate)
  components/          UI por pantalla (wizard, results, gift-detail, group...)
    taku/              el personaje: provider, dock, peek, loader, spot
  lib/
    ai/                AIRecommendationService (OpenAI) + mock honesto
    products/          ProductSearchService (Mercado Libre) + links de tiendas
    scoring/           compatibilidad determinística (0–100)
    data/              DataStore: SupabaseDataStore | LocalDataStore
    taku/              tipos, frases y contrato del futuro chatbot
    catalog.ts         opciones del wizard y sus etiquetas
    group-ranking.ts   ranking y empates (mismo cálculo en cliente y servidor)
```

- La IA propone candidatos y el **porqué**; el porcentaje de compatibilidad lo
  calcula código determinístico (`lib/scoring`). Nunca se inventan pistas ni se
  presentan precios estimados como reales.
- Identidad sin registro: sesión anónima de Supabase (o un uid en
  `localStorage` en modo local). Toda escritura pasa por API routes con la
  service role; RLS limita lo que el navegador ve por Realtime.

## Taku, el asistente

Taku usa siempre la imagen original (`assets/img/Taku-Giftly.png`); sus estados
(`idle`, `wave`, `curious`, `thinking`, `happy`, `celebrate`, `sad`) solo
cambian la animación y respetan `prefers-reduced-motion`.

| Momento | Qué hace Taku |
| --- | --- |
| Home | Protagonista del hero; al scrollear "se muda" a la esquina |
| Wizard | Un consejo por paso y un saltito al elegir |
| Generando ideas | Pantalla completa "pensando", narrando lo que hace |
| Resultados | Celebra y marca "La favorita de Taku" |
| Detalle | Explica el porqué en primera persona |
| Unirse / crear grupo / código | Se asoma por detrás de la tarjeta |
| Votación | Reacciona a cada puntaje; avisa cuando votaron todos |
| Ganador | Festeja en grande |
| Errores y vacíos | Reemplaza íconos genéricos |

El dock (esquina inferior izquierda) se puede minimizar y guarda el historial
de lo que Taku dijo. **Para conectar un chatbot real** implementá
`TakuChatAdapter` en [`src/lib/taku/chat.ts`](src/lib/taku/chat.ts) (por ejemplo
contra un route handler `/api/taku`): el input del panel se habilita solo y
recibe el historial y el contexto de la pantalla.

Para que Taku diga algo desde cualquier pantalla:

```tsx
const { say, sayOnce, react } = useTaku();
sayOnce("clave-unica", { text: "¡Listo!", mood: "celebrate" });
```
