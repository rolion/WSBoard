# REV-2026-11-24-pw-000-definicion-mvp-18

- TASK: [TASK-pw-000-definicion-mvp](../tasks/TASK-pw-000-definicion-mvp.md)
- Commit revisado: d110fd3
- Severidad: Low
- Categoría: IMPLEMENTATION
- Estado: Cerrado (verificado en ee5931b)
- Criterio / plan vigente: REV-13 / AC-2 · PLAN-2026-11-24-pw-000-definicion-mvp v2
- Etapa responsable: — (cerrado)

## Comportamiento esperado
El comentario de `shared/test/hardening.test.ts` describe el caso que prueba.

## Comportamiento observado
Líneas 79-80: el comentario dice que NFKC compone `"a\u0301"` en `á` (1 carácter). El caso probado es `"ab\u0301"` (marca sobre la `b`), que NFKC no compone y queda en 3 caracteres. La aserción es correcta y pasa; solo la explicación no es la real. La "Desviación" del TASK repite la explicación, pero se refiere al caso anterior, ya corregido.

## Evidencia
Volcado de code points de la línea 80 por el revisor (`a`, `b`, U+0301). Corrección propuesta: reescribir el comentario (el caso previo `"a\u0301"` fallaba por NFKC; este usa dos letras base).
