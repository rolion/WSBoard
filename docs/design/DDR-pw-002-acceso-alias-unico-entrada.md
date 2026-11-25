# DDR-pw-002-acceso-alias-unico-entrada — Pantalla de entrada por alias y sala provisional

- Estado: Aceptado (2026-11-25)
- Tarea: [TASK-pw-002-acceso-alias-unico](../tasks/TASK-pw-002-acceso-alias-unico.md)
- Concreta (sin reemplazar) la pantalla 1 y los estados de conexión del
  [DDR de PW-000](DDR-pw-000-definicion-mvp-experiencia.md).
- Sistema de diseño: no existe. Se fija estructura, textos y estados; los tokens
  visuales llegan con el layout (PW-003).

## Flujo

1. Al abrir la página se conecta el socket de forma automática. Si hay token en
   `sessionStorage`, se intenta `session:resume` y no se muestra la entrada salvo
   que falle.
2. Sin token (o con token rechazado) se muestra la **Entrada**.
3. Con `ok` en `session:join` se muestra la **Sala provisional**. Hasta ese momento no
   existen en el DOM ni la pizarra ni el chat.

## Pantalla Entrada

- Título "Port Webhook", campo "Tu nombre" (`autocomplete="off"`, `maxlength` sin
  forzar para que el servidor valide), ayuda "2 a 20 caracteres: letras, números,
  espacios, _ - .", botón "Entrar". Enter envía.
- El foco inicial va al campo; tras un error vuelve al campo con el texto
  conservado y seleccionado para reintentar.

| Estado | Qué ve el usuario |
|---|---|
| Conectando | Campo y botón deshabilitados; texto "Conectando con el servidor…" (`role="status"`). |
| Inactivo | Campo y botón habilitados. |
| Uniendo | Botón deshabilitado con "Entrando…"; el campo conserva el texto. Un solo envío en vuelo. |
| Error de alias | Mensaje bajo el campo (`role="alert"`), campo marcado `aria-invalid` y enlazado con `aria-describedby`; todo habilitado. |
| Sin conexión | Mensaje "No se pudo conectar con el servidor." y botón "Reintentar conexión"; el formulario queda deshabilitado hasta conectar. |
| Sesión expirada | Aviso informativo (`role="status"`) sobre el formulario; el formulario está habilitado. El aviso desaparece al enviar. |

### Textos (el `message` del servidor no se muestra)

| Código | Mensaje |
|---|---|
| `ALIAS_INVALID` | "Ese nombre no es válido. Usa entre 2 y 20 caracteres: letras, números, espacios, _ - ." |
| `ALIAS_TAKEN` | "Ese nombre ya está en uso. Elige otro." |
| `ROOM_FULL` | "La sala está llena (30 de 30). Inténtalo de nuevo en unos minutos." |
| `PROTOCOL_MISMATCH` | "Tu versión de la aplicación no es compatible. Recarga la página." |
| `RATE_LIMITED` y otros inesperados (`PAYLOAD_INVALID`, `ALREADY_JOINED`) | "No se pudo entrar. Inténtalo de nuevo." |
| ack sin respuesta (tiempo de espera) | "El servidor no respondió. Inténtalo de nuevo." |
| Socket caído al enviar | "No se pudo conectar con el servidor." |
| `SESSION_EXPIRED` | "Tu sesión expiró o la sala se reinició. Elige un nombre para volver a entrar. Si la sala se reinició, el dibujo y el chat anteriores se perdieron." |

El aviso de `SESSION_EXPIRED` **refina** el texto de D4/DDR de PW-000: el servidor no
distingue reinicio de gracia vencida (mismo código), y afirmar que se perdió el
dibujo cuando solo venció la gracia sería falso.

## Sala provisional

Pantalla mínima hasta PW-003: "Sala principal", "Conectado como **alias**", indicador
de conexión y botón "Salir" (`session:leave`, vuelve a la Entrada sin aviso y borra
el token). El alias se renderiza como texto escapado (React). Pizarra, chat y
lista de participantes no se montan.

| Estado de conexión | Qué ve el usuario |
|---|---|
| Conectado | Indicador "Conectado". |
| Reconectando | Banner "Reconectando…" (`role="status"`); botón "Salir" sigue habilitado. El **contador de la gracia no se muestra** en este TASK (PW-010). |
| Reconectado | El banner desaparece. |
| Sesión expirada | Vuelta a la Entrada con el aviso de arriba. |

## Accesibilidad

Etiqueta asociada al campo; Enter envía; errores con `role="alert"` (se anuncian), estados
con `role="status"`; contraste AA con los colores por defecto del navegador más el rojo
de error `#b00020` sobre blanco (≥ 4,5:1); botón ≥ 44 px de alto.
