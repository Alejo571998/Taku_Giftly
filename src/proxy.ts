import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * En producción el modo local no puede guardar datos (no hay disco): si el
 * deploy quedó sin Supabase, las APIs responden un mensaje claro en vez de
 * un error genérico. /api/health sigue disponible para diagnosticar.
 */
export function proxy(request: NextRequest) {
  if (process.env.VERCEL && !env.hasSupabase && !request.nextUrl.pathname.startsWith("/api/health")) {
    return NextResponse.json(
      {
        error:
          "Giftly está en mantenimiento: falta conectar la base de datos. Probá de nuevo en un rato.",
      },
      { status: 503, headers: { "Retry-After": "600" } }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
