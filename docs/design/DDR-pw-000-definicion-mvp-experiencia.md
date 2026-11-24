# DDR-pw-000-definicion-mvp-experiencia — Pantallas y estados del MVP

- Estado: Aceptado (2026-11-24)
- Tarea: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Sistema de diseño: no existe (`docs/design/design-system.md` ausente). Este
  DDR fija solo estructura y estados; los tokens visuales se definirán con el
  primer componente UI.

## Pantallas

### 1. Entrada (alias)
- Campo de alias, botón "Entrar". Texto de ayuda con las reglas (2–20
  caracteres).
- Estados: `inactivo`, `conectando` (botón deshabilitado, indicador),
  `error` (alias ocupado, alias inválido, sala llena, sin conexión con
  servidor), `sala reiniciada` (aviso informativo tras `SESSION_EXPIRED`).
- El foco va al campo; Enter envía. El error se anuncia con `aria-live`.

### 2. Sala
Escritorio: pizarra a la izquierda (ocupa el resto), columna derecha con
participantes (arriba) y chat (abajo). Móvil: pizarra arriba; pestañas
"Chat" y "Participantes" debajo.

- **Pizarra**: lienzo 16:9 con letterbox. Barra de herramientas: lápiz,
  borrador, selector de color (paleta fija de 8), grosor (3 niveles). Los
  controles por icono tienen nombre accesible.
- **Participantes**: lista con alias, indicador de estado (conectado /
  reconectando) y marca "(tú)". Contador "n/30".
- **Chat**: historial con alias y hora, campo de texto con contador al
  superar 400 caracteres, botón "Enviar". Mensajes propios alineados
  distinto. Auto-scroll salvo que el usuario haya subido.

## Estados de conexión (visibles en la sala)

| Estado | Qué ve el usuario |
|---|---|
| Conectado | Indicador verde discreto. Todo habilitado. |
| Reconectando | Banner "Reconectando…" y contador de la gracia; herramientas y chat deshabilitados; el lienzo se conserva. |
| Reconectado | El banner desaparece; el estado se reemplaza por el snapshot. |
| Sesión expirada / sala reiniciada | Vuelta a Entrada con aviso de pérdida de datos. |

## Estados límite

- `BOARD_FULL`: aviso "La pizarra alcanzó su límite" y herramienta de dibujo
  deshabilitada; el chat sigue funcionando.
- `RATE_LIMITED`: aviso breve no bloqueante.
- Mensaje de chat no confirmado: marcado "No enviado" con acción "Reintentar".
- Participante remoto en `reconnecting`: su alias aparece atenuado; su trazo
  abierto permanece hasta cerrarse.

## Accesibilidad básica

Controles operables con teclado (excepto el dibujo, que requiere puntero),
contraste AA, `aria-live` para errores y mensajes entrantes del chat
(polite), tamaños táctiles ≥ 44 px en móvil.
