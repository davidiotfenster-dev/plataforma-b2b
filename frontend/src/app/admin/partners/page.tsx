"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { CrearPartnerInput, Paginado, Partner } from "@/lib/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Paginacion } from "@/components/paginacion";
import { useMe } from "@/hooks/use-me";

const LIMITE_POR_PAGINA = 20;

const ESTILOS_ESTADO: Record<string, string> = {
  PENDIENTE_VERIFICACION_EMAIL: "bg-neutral-100 text-neutral-600",
  PENDIENTE_APROBACION: "bg-amber-100 text-amber-700",
  ACTIVO: "bg-green-100 text-green-700",
  SUSPENDIDO: "bg-red-100 text-red-700",
  RECHAZADO: "bg-neutral-200 text-neutral-500",
};

function AprobarForm({ partnerId, onDone }: { partnerId: string; onDone: () => void }) {
  const t = useTranslations("adminPartners");
  const [marcaComercial, setMarcaComercial] = useState("");
  const [tarifa, setTarifa] = useState("");
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const aprobar = useMutation({
    mutationFn: () =>
      api.post(`/auth/partners/${partnerId}/aprobar`, {
        marcaComercial,
        tarifa,
        descuentoPorcentaje: Number(descuentoPorcentaje),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("approveError")),
  });

  return (
    <div className="mt-3 grid grid-cols-1 gap-2 rounded-md bg-neutral-50 p-3 sm:grid-cols-4">
      <input
        placeholder={t("brandPlaceholder")}
        value={marcaComercial}
        onChange={(e) => setMarcaComercial(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <input
        placeholder={t("tariffPlaceholder")}
        value={tarifa}
        onChange={(e) => setTarifa(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <input
        type="number"
        min={0}
        max={100}
        placeholder={t("discountPlaceholder")}
        value={descuentoPorcentaje}
        onChange={(e) => setDescuentoPorcentaje(e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <button
        onClick={() => {
          setError(null);
          aprobar.mutate();
        }}
        disabled={aprobar.isPending || !marcaComercial || !tarifa}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {t("confirmApproval")}
      </button>
      {error && <p className="col-span-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function CrearPartnerForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("adminPartners");
  const queryClient = useQueryClient();
  const [razonSocial, setRazonSocial] = useState("");
  const [cif, setCif] = useState("");
  const [direccionFiscal, setDireccionFiscal] = useState("");
  const [pais, setPais] = useState("España");
  const [dominioWeb, setDominioWeb] = useState("");
  const [codigoCliente, setCodigoCliente] = useState("");
  const [marcaComercial, setMarcaComercial] = useState("");
  const [tarifa, setTarifa] = useState("");
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState("0");
  const [telefono1, setTelefono1] = useState("");
  const [telefono2, setTelefono2] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [direccionEnvioDefecto, setDireccionEnvioDefecto] = useState("");
  const [codigoPostalEnvio, setCodigoPostalEnvio] = useState("");
  const [localidadEnvio, setLocalidadEnvio] = useState("");
  const [provinciaEnvio, setProvinciaEnvio] = useState("");
  const [paisEnvio, setPaisEnvio] = useState("");
  const [correoContacto1, setCorreoContacto1] = useState("");
  const [correoContacto2, setCorreoContacto2] = useState("");
  const [correoFacturacion, setCorreoFacturacion] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [divisa, setDivisa] = useState("");
  const [iva, setIva] = useState("");
  const [notas, setNotas] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [emailUsuario, setEmailUsuario] = useState("");
  const [passwordUsuario, setPasswordUsuario] = useState("");
  const [error, setError] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: () => {
      const payload: CrearPartnerInput = {
        razonSocial,
        cif,
        direccionFiscal,
        pais,
        dominioWeb,
        codigoCliente: codigoCliente.trim() || undefined,
        marcaComercial: marcaComercial.trim() || undefined,
        tarifa: tarifa.trim() || undefined,
        descuentoPorcentaje: Number(descuentoPorcentaje),
        telefono1: telefono1.trim() || undefined,
        telefono2: telefono2.trim() || undefined,
        codigoPostal: codigoPostal.trim() || undefined,
        localidad: localidad.trim() || undefined,
        provincia: provincia.trim() || undefined,
        direccionEnvioDefecto: direccionEnvioDefecto.trim() || undefined,
        codigoPostalEnvio: codigoPostalEnvio.trim() || undefined,
        localidadEnvio: localidadEnvio.trim() || undefined,
        provinciaEnvio: provinciaEnvio.trim() || undefined,
        paisEnvio: paisEnvio.trim() || undefined,
        correoContacto1: correoContacto1.trim() || undefined,
        correoContacto2: correoContacto2.trim() || undefined,
        correoFacturacion: correoFacturacion.trim() || undefined,
        formaPago: formaPago.trim() || undefined,
        divisa: divisa.trim() || undefined,
        iva: iva.trim() === "" ? undefined : Number(iva),
        notas: notas.trim() || undefined,
        nombreUsuario,
        emailUsuario,
        passwordUsuario,
      };
      return api.post("/partners", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  const camposObligatoriosOk =
    razonSocial.trim() && cif.trim() && direccionFiscal.trim() && pais.trim() && dominioWeb.trim() &&
    nombreUsuario.trim() && emailUsuario.trim() && passwordUsuario.length >= 8;

  return (
    <div className="mb-6 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="text-sm font-semibold text-neutral-900">{t("createTitle")}</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={razonSocial}
          onChange={(e) => setRazonSocial(e.target.value)}
          placeholder={t("companyNamePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={cif}
          onChange={(e) => setCif(e.target.value)}
          placeholder={t("cifPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={codigoCliente}
          onChange={(e) => setCodigoCliente(e.target.value)}
          placeholder={t("clientCodePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={direccionFiscal}
          onChange={(e) => setDireccionFiscal(e.target.value)}
          placeholder={t("addressPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm sm:col-span-2"
        />
        <input
          value={pais}
          onChange={(e) => setPais(e.target.value)}
          placeholder={t("countryPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={dominioWeb}
          onChange={(e) => setDominioWeb(e.target.value)}
          placeholder={t("domainPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={marcaComercial}
          onChange={(e) => setMarcaComercial(e.target.value)}
          placeholder={t("brandPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={tarifa}
          onChange={(e) => setTarifa(e.target.value)}
          placeholder={t("tariffPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={descuentoPorcentaje}
          onChange={(e) => setDescuentoPorcentaje(e.target.value)}
          placeholder={t("discountPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <p className="text-xs font-medium text-neutral-500">{t("fichaClienteTitle")}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          type="tel"
          value={telefono1}
          onChange={(e) => setTelefono1(e.target.value)}
          placeholder={t("phone1Placeholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="tel"
          value={telefono2}
          onChange={(e) => setTelefono2(e.target.value)}
          placeholder={t("phone2Placeholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={codigoPostal}
          onChange={(e) => setCodigoPostal(e.target.value)}
          placeholder={t("postalCodePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={localidad}
          onChange={(e) => setLocalidad(e.target.value)}
          placeholder={t("cityPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={provincia}
          onChange={(e) => setProvincia(e.target.value)}
          placeholder={t("provincePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="email"
          value={correoContacto1}
          onChange={(e) => setCorreoContacto1(e.target.value)}
          placeholder={t("contactEmail1Placeholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="email"
          value={correoContacto2}
          onChange={(e) => setCorreoContacto2(e.target.value)}
          placeholder={t("contactEmail2Placeholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="email"
          value={correoFacturacion}
          onChange={(e) => setCorreoFacturacion(e.target.value)}
          placeholder={t("billingEmailPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={formaPago}
          onChange={(e) => setFormaPago(e.target.value)}
          placeholder={t("paymentMethodPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={divisa}
          onChange={(e) => setDivisa(e.target.value)}
          placeholder={t("currencyPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={iva}
          onChange={(e) => setIva(e.target.value)}
          placeholder={t("ivaPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <p className="text-xs font-medium text-neutral-500">{t("shippingAddressTitle")}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={direccionEnvioDefecto}
          onChange={(e) => setDireccionEnvioDefecto(e.target.value)}
          placeholder={t("shippingAddressPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm sm:col-span-2"
        />
        <input
          value={codigoPostalEnvio}
          onChange={(e) => setCodigoPostalEnvio(e.target.value)}
          placeholder={t("shippingPostalCodePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={localidadEnvio}
          onChange={(e) => setLocalidadEnvio(e.target.value)}
          placeholder={t("shippingCityPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={provinciaEnvio}
          onChange={(e) => setProvinciaEnvio(e.target.value)}
          placeholder={t("shippingProvincePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={paisEnvio}
          onChange={(e) => setPaisEnvio(e.target.value)}
          placeholder={t("shippingCountryPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder={t("notesPlaceholder")}
        rows={3}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <p className="text-xs font-medium text-neutral-500">{t("firstUserTitle")}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={nombreUsuario}
          onChange={(e) => setNombreUsuario(e.target.value)}
          placeholder={t("userNamePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="email"
          value={emailUsuario}
          onChange={(e) => setEmailUsuario(e.target.value)}
          placeholder={t("userEmailPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="text"
          value={passwordUsuario}
          onChange={(e) => setPasswordUsuario(e.target.value)}
          placeholder={t("userPasswordPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setError(null);
            crear.mutate();
          }}
          disabled={crear.isPending || !camposObligatoriosOk}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {crear.isPending ? t("creating") : t("createButton")}
        </button>
        <button
          onClick={onDone}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}

function EditarPartnerForm({ partner, onDone }: { partner: Partner; onDone: () => void }) {
  const t = useTranslations("adminPartners");
  const queryClient = useQueryClient();
  const [razonSocial, setRazonSocial] = useState(partner.razonSocial);
  const [cif, setCif] = useState(partner.cif);
  const [direccionFiscal, setDireccionFiscal] = useState(partner.direccionFiscal);
  const [pais, setPais] = useState(partner.pais);
  const [dominioWeb, setDominioWeb] = useState(partner.dominioWeb);
  const [codigoCliente, setCodigoCliente] = useState(partner.codigoCliente ?? "");
  const [marcaComercial, setMarcaComercial] = useState(partner.marcaComercial ?? "");
  const [tarifa, setTarifa] = useState(partner.tarifa ?? "");
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(partner.descuentoPorcentaje);
  const [telefono1, setTelefono1] = useState(partner.telefono1 ?? "");
  const [telefono2, setTelefono2] = useState(partner.telefono2 ?? "");
  const [codigoPostal, setCodigoPostal] = useState(partner.codigoPostal ?? "");
  const [localidad, setLocalidad] = useState(partner.localidad ?? "");
  const [provincia, setProvincia] = useState(partner.provincia ?? "");
  const [direccionEnvioDefecto, setDireccionEnvioDefecto] = useState(partner.direccionEnvioDefecto ?? "");
  const [codigoPostalEnvio, setCodigoPostalEnvio] = useState(partner.codigoPostalEnvio ?? "");
  const [localidadEnvio, setLocalidadEnvio] = useState(partner.localidadEnvio ?? "");
  const [provinciaEnvio, setProvinciaEnvio] = useState(partner.provinciaEnvio ?? "");
  const [paisEnvio, setPaisEnvio] = useState(partner.paisEnvio ?? "");
  const [correoContacto1, setCorreoContacto1] = useState(partner.correoContacto1 ?? "");
  const [correoContacto2, setCorreoContacto2] = useState(partner.correoContacto2 ?? "");
  const [correoFacturacion, setCorreoFacturacion] = useState(partner.correoFacturacion ?? "");
  const [formaPago, setFormaPago] = useState(partner.formaPago ?? "");
  const [divisa, setDivisa] = useState(partner.divisa ?? "");
  const [iva, setIva] = useState(partner.iva ?? "");
  const [notas, setNotas] = useState(partner.notas ?? "");
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: () =>
      api.patch(`/partners/${partner.id}`, {
        razonSocial,
        cif,
        direccionFiscal,
        pais,
        dominioWeb,
        codigoCliente: codigoCliente.trim() === "" ? null : codigoCliente,
        marcaComercial: marcaComercial.trim() === "" ? undefined : marcaComercial,
        tarifa: tarifa.trim() === "" ? undefined : tarifa,
        descuentoPorcentaje: Number(descuentoPorcentaje),
        telefono1: telefono1.trim() === "" ? null : telefono1,
        telefono2: telefono2.trim() === "" ? null : telefono2,
        codigoPostal: codigoPostal.trim() === "" ? null : codigoPostal,
        localidad: localidad.trim() === "" ? null : localidad,
        provincia: provincia.trim() === "" ? null : provincia,
        direccionEnvioDefecto: direccionEnvioDefecto.trim() === "" ? null : direccionEnvioDefecto,
        codigoPostalEnvio: codigoPostalEnvio.trim() === "" ? null : codigoPostalEnvio,
        localidadEnvio: localidadEnvio.trim() === "" ? null : localidadEnvio,
        provinciaEnvio: provinciaEnvio.trim() === "" ? null : provinciaEnvio,
        paisEnvio: paisEnvio.trim() === "" ? null : paisEnvio,
        correoContacto1: correoContacto1.trim() === "" ? null : correoContacto1,
        correoContacto2: correoContacto2.trim() === "" ? null : correoContacto2,
        correoFacturacion: correoFacturacion.trim() === "" ? null : correoFacturacion,
        formaPago: formaPago.trim() === "" ? null : formaPago,
        divisa: divisa.trim() === "" ? null : divisa,
        iva: String(iva).trim() === "" ? null : Number(iva),
        notas: notas.trim() === "" ? null : notas,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t("genericError")),
  });

  return (
    <div className="mt-3 space-y-2 rounded-md bg-neutral-50 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={razonSocial}
          onChange={(e) => setRazonSocial(e.target.value)}
          placeholder={t("companyNamePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={cif}
          onChange={(e) => setCif(e.target.value)}
          placeholder={t("cifPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={codigoCliente}
          onChange={(e) => setCodigoCliente(e.target.value)}
          placeholder={t("clientCodePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={direccionFiscal}
          onChange={(e) => setDireccionFiscal(e.target.value)}
          placeholder={t("addressPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm sm:col-span-2"
        />
        <input
          value={pais}
          onChange={(e) => setPais(e.target.value)}
          placeholder={t("countryPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={dominioWeb}
          onChange={(e) => setDominioWeb(e.target.value)}
          placeholder={t("domainPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={marcaComercial}
          onChange={(e) => setMarcaComercial(e.target.value)}
          placeholder={t("brandPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={tarifa}
          onChange={(e) => setTarifa(e.target.value)}
          placeholder={t("tariffPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={descuentoPorcentaje}
          onChange={(e) => setDescuentoPorcentaje(e.target.value)}
          placeholder={t("discountPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <p className="text-xs font-medium text-neutral-500">{t("fichaClienteTitle")}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          type="tel"
          value={telefono1}
          onChange={(e) => setTelefono1(e.target.value)}
          placeholder={t("phone1Placeholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="tel"
          value={telefono2}
          onChange={(e) => setTelefono2(e.target.value)}
          placeholder={t("phone2Placeholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={codigoPostal}
          onChange={(e) => setCodigoPostal(e.target.value)}
          placeholder={t("postalCodePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={localidad}
          onChange={(e) => setLocalidad(e.target.value)}
          placeholder={t("cityPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={provincia}
          onChange={(e) => setProvincia(e.target.value)}
          placeholder={t("provincePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="email"
          value={correoContacto1}
          onChange={(e) => setCorreoContacto1(e.target.value)}
          placeholder={t("contactEmail1Placeholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="email"
          value={correoContacto2}
          onChange={(e) => setCorreoContacto2(e.target.value)}
          placeholder={t("contactEmail2Placeholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="email"
          value={correoFacturacion}
          onChange={(e) => setCorreoFacturacion(e.target.value)}
          placeholder={t("billingEmailPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={formaPago}
          onChange={(e) => setFormaPago(e.target.value)}
          placeholder={t("paymentMethodPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={divisa}
          onChange={(e) => setDivisa(e.target.value)}
          placeholder={t("currencyPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={iva}
          onChange={(e) => setIva(e.target.value)}
          placeholder={t("ivaPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <p className="text-xs font-medium text-neutral-500">{t("shippingAddressTitle")}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={direccionEnvioDefecto}
          onChange={(e) => setDireccionEnvioDefecto(e.target.value)}
          placeholder={t("shippingAddressPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm sm:col-span-2"
        />
        <input
          value={codigoPostalEnvio}
          onChange={(e) => setCodigoPostalEnvio(e.target.value)}
          placeholder={t("shippingPostalCodePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={localidadEnvio}
          onChange={(e) => setLocalidadEnvio(e.target.value)}
          placeholder={t("shippingCityPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={provinciaEnvio}
          onChange={(e) => setProvinciaEnvio(e.target.value)}
          placeholder={t("shippingProvincePlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          value={paisEnvio}
          onChange={(e) => setPaisEnvio(e.target.value)}
          placeholder={t("shippingCountryPlaceholder")}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder={t("notesPlaceholder")}
        rows={4}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setError(null);
            guardar.mutate();
          }}
          disabled={guardar.isPending || !razonSocial.trim() || !cif.trim()}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {guardar.isPending ? t("saving") : t("save")}
        </button>
        <button
          onClick={onDone}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}

export default function AdminPartnersPage() {
  const t = useTranslations("adminPartners");
  const tEstadosPartner = useTranslations("estadosPartner");
  const queryClient = useQueryClient();
  const { data: perfil } = useMe();
  const esAdmin = perfil?.rol === "ADMIN_FENSTER";
  const [creando, setCreando] = useState(false);
  const [aprobando, setAprobando] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [accionError, setAccionError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const busquedaDebounced = useDebouncedValue(busqueda);

  /// Al cambiar el término de búsqueda, siempre se vuelve a la página 1
  /// (una página de un resultado anterior puede no existir en el nuevo).
  useEffect(() => {
    setPage(1);
  }, [busquedaDebounced]);

  const { data: respuesta, isLoading } = useQuery<Paginado<Partner>>({
    queryKey: ["admin-partners", page, busquedaDebounced],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMITE_POR_PAGINA) });
      if (busquedaDebounced.trim()) params.set("busqueda", busquedaDebounced.trim());
      return api.get<Paginado<Partner>>(`/partners?${params}`);
    },
    placeholderData: (anterior) => anterior,
  });
  const partners = respuesta?.data;

  function refrescar() {
    setAccionError(null);
    queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
  }

  function manejarError(err: unknown) {
    setAccionError(err instanceof ApiError ? err.message : t("genericError"));
  }

  const rechazar = useMutation({
    mutationFn: (id: string) => api.post(`/auth/partners/${id}/rechazar`),
    onSuccess: refrescar,
    onError: manejarError,
  });
  const suspender = useMutation({
    mutationFn: (id: string) => api.post(`/partners/${id}/suspender`),
    onSuccess: refrescar,
    onError: manejarError,
  });
  const reactivar = useMutation({
    mutationFn: (id: string) => api.post(`/partners/${id}/reactivar`),
    onSuccess: refrescar,
    onError: manejarError,
  });

  const accionEnCurso = rechazar.isPending || suspender.isPending || reactivar.isPending;

  if (isLoading) return <p className="text-neutral-500">{t("loading")}</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">{t("title")}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-56 rounded-md border border-neutral-200 py-1.5 pl-8 pr-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setCreando((v) => !v)}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            {t("newPartner")}
          </button>
        </div>
      </div>
      {creando && <CrearPartnerForm onDone={() => setCreando(false)} />}
      {accionError && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {accionError}
        </p>
      )}
      <div className="space-y-3">
        {partners?.map((partner) => (
          <div key={partner.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-neutral-900">{partner.razonSocial}</p>
                <p className="text-xs text-neutral-400">
                  {partner.cif} · {partner.dominioWeb}
                  {partner.codigoCliente && ` · ${t("clientCode", { codigo: partner.codigoCliente })}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ESTILOS_ESTADO[partner.estado]}`}>
                  {tEstadosPartner(partner.estado)}
                </span>
                {esAdmin && partner.estado === "PENDIENTE_APROBACION" && (
                  <>
                    <button
                      onClick={() => setAprobando(partner.id)}
                      className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
                    >
                      {t("approve")}
                    </button>
                    <button
                      onClick={() => {
                        setAccionError(null);
                        rechazar.mutate(partner.id);
                      }}
                      disabled={accionEnCurso}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {t("reject")}
                    </button>
                  </>
                )}
                {partner.estado === "ACTIVO" && (
                  <button
                    onClick={() => {
                      setAccionError(null);
                      suspender.mutate(partner.id);
                    }}
                    disabled={accionEnCurso}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {t("suspend")}
                  </button>
                )}
                {partner.estado === "SUSPENDIDO" && (
                  <button
                    onClick={() => {
                      setAccionError(null);
                      reactivar.mutate(partner.id);
                    }}
                    disabled={accionEnCurso}
                    className="rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    {t("reactivate")}
                  </button>
                )}
                {esAdmin && (
                  <Link
                    href={`/admin/partners/${partner.id}/usuarios`}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {t("users")}
                  </Link>
                )}
                <Link
                  href={`/admin/partners/${partner.id}/catalogo`}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  {t("catalog")}
                </Link>
                <button
                  onClick={() => setEditando(editando === partner.id ? null : partner.id)}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  {t("edit")}
                </button>
              </div>
            </div>
            {partner.estado === "ACTIVO" && (
              <p className="mt-2 text-xs text-neutral-500">
                {t("summary", {
                  marca: partner.marcaComercial ?? "",
                  tarifa: partner.tarifa ?? "",
                  descuento: partner.descuentoPorcentaje,
                })}
              </p>
            )}
            {aprobando === partner.id && (
              <AprobarForm partnerId={partner.id} onDone={() => setAprobando(null)} />
            )}
            {editando === partner.id && (
              <EditarPartnerForm partner={partner} onDone={() => setEditando(null)} />
            )}
          </div>
        ))}
        {respuesta?.total === 0 && (
          <p className="text-neutral-500">{busquedaDebounced.trim() ? t("noResults") : t("empty")}</p>
        )}
      </div>
      {respuesta && (
        <Paginacion page={respuesta.page} limit={respuesta.limit} total={respuesta.total} onPageChange={setPage} />
      )}
    </div>
  );
}
