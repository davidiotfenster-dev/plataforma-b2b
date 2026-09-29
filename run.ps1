# Lanzador desatendido para Windows (PowerShell).
# - Muestra en tiempo real lo que hace Claude (y lo guarda en claude_log.txt)
# - Mantiene el equipo despierto mientras corre
# - Si se agota el límite de uso, espera y reintenta solo hasta terminar TAREAS.md
Set-Location $PSScriptRoot

# UTF-8 para acentos en entrada y salida
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

# Impedir suspensión solo mientras este script está en marcha
Add-Type -Namespace Win32 -Name Power -MemberDefinition @'
[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);
'@
[Win32.Power]::SetThreadExecutionState([uint32]2147483713) | Out-Null   # CONTINUOUS|SYSTEM|AWAYMODE

$Espera = 1800      # espera si se alcanza el LÍMITE DE USO (30 min)
$EsperaCorta = 15   # espera si Claude simplemente paró (seg)
$MaxIntentos = 200  # tope de seguridad de relanzamientos
$Log = "claude_log.txt"

function Escribe($texto, $color = "Gray") {
  $linea = "[$(Get-Date -Format 'HH:mm:ss')] $texto"
  Write-Host $linea -ForegroundColor $color
  Add-Content -Path $Log -Value $linea -Encoding UTF8
}

$script:Limite = $false
function Revisa-Limite($t) { if ($t -match "(?i)usage limit|rate.?limit|limit reached|reached your|resets? (at|in)|429|overloaded") { $script:Limite = $true } }

function Muestra-Evento($json) {
  try { $e = $json | ConvertFrom-Json } catch { return }
  switch ($e.type) {
    "assistant" {
      foreach ($c in $e.message.content) {
        if ($c.type -eq "text" -and $c.text.Trim()) { Escribe "Claude: $($c.text.Trim())" "White" }
        elseif ($c.type -eq "tool_use") {
          $detalle = ""
          if ($c.input.command)   { $detalle = $c.input.command }
          elseif ($c.input.file_path) { $detalle = $c.input.file_path }
          elseif ($c.input.pattern)   { $detalle = $c.input.pattern }
          if ($detalle.Length -gt 150) { $detalle = $detalle.Substring(0,150) + "..." }
          Escribe "  -> $($c.name): $detalle" "Cyan"
        }
      }
    }
    "result" {
      if ($e.is_error) { Revisa-Limite "$($e.result)"; Escribe "Fin con error: $($e.result)" "Red" }
      else { Escribe "Fin de la ejecución ($([math]::Round($e.duration_ms/60000,1)) min)" "Green" }
    }
  }
}

try { docker compose up -d 2>&1 | Out-Null; Escribe "PostgreSQL arrancado" "Green" }
catch { Escribe "No pude arrancar docker (Claude lo reintentará)" "Yellow" }

try {
  $i = 0
  while (-not (Test-Path ".claude_done") -and $i -lt $MaxIntentos) {
    $i++
    $script:Limite = $false
    $inicio = Get-Date
    Escribe "===== Ejecución $i =====" "Yellow"
    Get-Content -Raw "PROMPT.md" |
      claude -p --output-format stream-json --verbose --permission-mode acceptEdits 2>&1 |
      ForEach-Object {
        $l = "$_"
        if ($l.StartsWith("{")) { Muestra-Evento $l } elseif ($l.Trim()) { Revisa-Limite $l; Escribe $l "DarkYellow" }
      }
    if (Test-Path ".claude_done") { break }
    $duracion = ((Get-Date) - $inicio).TotalSeconds
    if ($script:Limite) {
      $vuelta = (Get-Date).AddSeconds($Espera).ToString("HH:mm")
      Escribe "LÍMITE DE USO alcanzado. Reintento a las $vuelta." "Magenta"
      Start-Sleep -Seconds $Espera
    } elseif ($duracion -lt 20) {
      # Sale al instante sin motivo claro: evitar bucle rápido
      Escribe "Claude salió muy rápido sin avisar de límite. Reintento en 2 min." "Yellow"
      Start-Sleep -Seconds 120
    } else {
      Escribe "Claude paró antes de terminar. Lo relanzo en $EsperaCorta s para que siga." "Yellow"
      Start-Sleep -Seconds $EsperaCorta
    }
  }
  if (Test-Path ".claude_done") { Escribe "TERMINADO. Revisa TAREAS.md y PROGRESO.md" "Green" }
  else { Escribe "Máximo de intentos alcanzado sin terminar" "Red" }
}
finally {
  [Win32.Power]::SetThreadExecutionState([uint32]2147483648) | Out-Null  # restaurar suspensión normal
}
