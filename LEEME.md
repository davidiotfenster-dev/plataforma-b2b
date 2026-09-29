# Kit desatendido FENSTER

Copia TODO el contenido de esta carpeta (incluida la carpeta oculta `.claude`) a la raíz de tu proyecto, junto a CLAUDE.md e INFORME_TECNICO.md.

## Antes de irte
1. Ten instalado Claude Code, Node.js y Docker Desktop (abierto).
2. Portátil: enchufado, y en ajustes de energía que cerrar la tapa NO suspenda (o déjala abierta).
3. Prueba rápida: `claude -p "di hola"` debe responder sin pedir login.

## Lanzar
- **Mac / Linux / WSL:** `./run.sh`
- **Windows (PowerShell):** `powershell -ExecutionPolicy Bypass -File .\run.ps1`

Deja la terminal abierta. El script evita que el equipo se duerma, arranca PostgreSQL y relanza Claude cada 30 min si se corta por el límite.

## Al volver
- `claude_log.txt` → qué ha pasado
- `TAREAS.md` → qué está hecho `[x]` o bloqueado `[!]`
- `PROGRESO.md` y `DECISIONES.md` → notas y decisiones de Claude
- `SETUP.md` → comandos de la BD documentados

Para repetir con tareas nuevas: edita TAREAS.md y borra `.claude_done`.
