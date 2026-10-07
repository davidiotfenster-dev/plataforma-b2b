import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ContextoPeticion {
  requestId: string;
}

const almacen = new AsyncLocalStorage<ContextoPeticion>();

/// `X-Request-Id` de la petición HTTP en curso, para propagarlo a la API de Partners
/// (trazabilidad extremo a extremo). Fuera de una petición (scripts, tareas) no hay.
export function requestIdActual(): string | undefined {
  return almacen.getStore()?.requestId;
}

/// Middleware: cada petición lleva un `X-Request-Id` UUID v4. Se respeta el que mande
/// el cliente si es un UUID v4 válido (cualquier otra cosa se descarta) y se devuelve
/// en la respuesta para poder cruzar logs del frontend, NestJS y AWS.
export function middlewareRequestId(req: Request, res: Response, next: NextFunction): void {
  const recibido = req.get('x-request-id');
  const requestId = recibido && UUID_V4.test(recibido) ? recibido.toLowerCase() : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  almacen.run({ requestId }, next);
}

export function ejecutarConRequestId<T>(requestId: string, fn: () => T): T {
  return almacen.run({ requestId }, fn);
}
