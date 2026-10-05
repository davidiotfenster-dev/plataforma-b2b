import { Transform } from 'class-transformer';

/// Quita los espacios del principio y del final antes de validar. Así
/// `@IsNotEmpty()` rechaza también un campo escrito solo con espacios (por
/// ejemplo una dirección de envío "   "), y lo que se guarda no arrastra
/// espacios sobrantes. Los valores que no son texto pasan sin tocar para
/// que los rechace su propia validación.
export function Recortar(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
}
