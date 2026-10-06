"use client";

import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";
import { api, ApiError } from "@/lib/api";

/// Destino del enlace que llega por correo tras registrar una empresa. Verificar
/// es de un solo uso (el servidor borra el token), así que la petición se hace una
/// vez y no se repite al volver a la pestaña ni al reintentar.
function VerificarEmail() {
  const t = useTranslations("verificarEmail");
  const token = useSearchParams().get("token");

  const verificacion = useQuery({
    queryKey: ["verificar-email", token],
    queryFn: () => api.get(`/auth/verificar-email?token=${encodeURIComponent(token!)}`),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (!token) {
    return (
      <Aviso tono="error" titulo={t("missingTokenTitle")} texto={t("missingTokenBody")}>
        <ReenviarEnlace />
      </Aviso>
    );
  }

  if (verificacion.isPending) {
    return (
      <p className="mx-auto flex max-w-md items-center justify-center gap-2 text-neutral-500" role="status">
        <Loader2 className="size-4 animate-spin" /> {t("verifying")}
      </p>
    );
  }

  if (verificacion.isSuccess) {
    return (
      <Aviso tono="ok" titulo={t("doneTitle")} texto={t("doneBody")}>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline">
          {t("goToLogin")}
        </Link>
      </Aviso>
    );
  }

  const status = verificacion.error instanceof ApiError ? verificacion.error.status : 0;
  // 409: el alta ya no estaba pendiente de verificar (el correo ya se verificó antes).
  if (status === 409) {
    return (
      <Aviso tono="ok" titulo={t("alreadyTitle")} texto={t("alreadyBody")}>
        <Link href="/login" className="mt-6 inline-block text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline">
          {t("goToLogin")}
        </Link>
      </Aviso>
    );
  }

  // 410: enlace caducado o manipulado. 400: ya usado o no corresponde a ninguna cuenta.
  return (
    <Aviso
      tono="error"
      titulo={status === 410 ? t("expiredTitle") : t("invalidTitle")}
      texto={status === 410 ? t("expiredBody") : status === 400 ? t("invalidBody") : t("genericError")}
    >
      <ReenviarEnlace />
    </Aviso>
  );
}

function Aviso({
  tono,
  titulo,
  texto,
  children,
}: {
  tono: "ok" | "error";
  titulo: string;
  texto: string;
  children?: ReactNode;
}) {
  const Icono = tono === "ok" ? CheckCircle2 : MailWarning;
  return (
    <div className="mx-auto mt-6 w-full max-w-md rounded-2xl border border-neutral-200 bg-white px-6 py-8 text-center shadow-sm sm:mt-12 sm:px-8">
      <Icono className={`mx-auto size-10 ${tono === "ok" ? "text-teal-600" : "text-amber-600"}`} aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">{titulo}</h1>
      <p className="mt-3 text-neutral-600">{texto}</p>
      {children}
    </div>
  );
}

/// "No me llegó / me caducó el enlace". El servidor responde lo mismo exista o
/// no la cuenta, así que aquí tampoco se distingue.
function ReenviarEnlace() {
  const t = useTranslations("verificarEmail");
  const tCommon = useTranslations("common");
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await api.post("/auth/reenviar-verificacion", { email: email.trim() });
      setEnviado(true);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? t("tooManyRequests") : tCommon("unexpectedError"));
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <p role="status" className="mt-6 rounded-lg bg-teal-50 px-3 py-2.5 text-sm text-teal-800">
        {t("resendDone")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3 border-t border-neutral-100 pt-6 text-left">
      <label htmlFor="verificar-email-reenviar" className="block text-sm font-medium text-neutral-700">
        {t("resendLabel")}
      </label>
      <input
        id="verificar-email-reenviar"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={cargando}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {cargando ? t("resendSubmitting") : t("resendSubmit")}
      </button>
    </form>
  );
}

export default function VerificarEmailPage() {
  const tCommon = useTranslations("common");
  return (
    <Suspense fallback={<p className="text-neutral-500">{tCommon("loading")}</p>}>
      <VerificarEmail />
    </Suspense>
  );
}
