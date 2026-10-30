# NeuroFlex — Documento de Arquitectura

> Documento vivo. Toda decisión estructural se escribe aquí ANTES de programarla.
> Si el código y este documento no coinciden, uno de los dos está mal y hay que arreglarlo el mismo día.

---

## 1. Objetivo

Plataforma web para estudiantes de Educación Diferencial. Desarrolla y mide
**funciones ejecutivas** (planificación, flexibilidad cognitiva, autocontrol,
memoria de trabajo) mediante juegos cognitivos y mini casos interactivos.

Dos roles: `student` y `admin`. El rol de docente se eliminó a pedido del cliente
(no hay intermediarios): el administrador ve directamente los datos de los
estudiantes. Las cuentas y fichas de docente que hubiera en la base se quitan con
`server-scripts/removeTeachers.ts`.

---

## 2. Stack

**Frontend (actual)**
React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router 7 ·
React Hook Form · Zod 4 · Sonner · Axios · oxlint

**Backend (pendiente)**
Node · MongoDB Atlas · JWT

Hoy el backend está **simulado** con datasources en memoria detrás de repositorios.

---

## 3. Reglas del dominio (no negociables)

1. El **RUT** es el identificador principal. Formato canónico en base de datos: `12345678-5`
   (sin puntos, con guion, K mayúscula). Se normaliza con `normalizeForDatabase()`.
2. **Nunca** se inicia sesión con correo electrónico.
3. **Nunca** se eliminan usuarios. Solo se marca `enabled: false`. La única
   excepción es la limpieza única del rol de docente (`removeTeachers.ts`).
4. Solo pueden registrarse estudiantes **previamente cargados** por la universidad.
   Los administradores **no se autorregistran**: otro administrador los da de alta
   desde el panel (ficha + cuenta con contraseña inicial). Por eso `registerService` consulta
   únicamente `studentRepository`.
5. No se guarda el nombre completo en un solo campo:
   `firstName` + `paternalLastName` + `maternalLastName`.
6. No se guardan cohortes como entidad; se derivan de `entryYear` + `entrySemester`.
7. Ningún componente accede directamente a un datasource. Siempre vía repositorio.
8. **Nombres y apellidos** se guardan con la inicial de cada palabra en mayúscula y el
   resto en minúscula (`Camilo Andres Briones Vergara`), sin importar cómo se escriban:
   `lib/personName.ts` en el servidor (autoritativo) y `src/utils/personName.ts` en el
   navegador (se ve mientras se escribe); `lib/personNameParity.test.ts` comprueba que
   coincidan. Un administrador puede corregir nombres y apellidos de estudiantes y de
   administradores (incluido el suyo; cambio legal de nombre); el RUT nunca cambia.
9. **Contraseñas:** mínimo 8, letras y números, una mayúscula, un carácter especial y
   ningún dígito repetido seguido (`lib/password.ts`, copia en `src/utils/password.ts`,
   `lib/passwordParity.test.ts`). Las generadas al azar (12 caracteres) cumplen esas
   reglas y se guardan siempre cifradas. Quien tiene sesión cambia la suya con
   `POST /api/auth/password` (pide la actual). Un administrador genera una nueva para un
   estudiante con `POST /api/admin/students/:rut/password`, confirmando con su propia
   contraseña; si el estudiante aún no se registró se le crea la cuenta (queda registrado).
   Igual hace un administrador con otro (`POST /api/admin/admins/:rut/password`, no con
   la propia: esa se cambia desde el perfil). La contraseña generada se muestra una sola
   vez y no se puede volver a ver.
10. **Velocidad de carga** (no deshacer sin medir):
    - Solo el login viaja en el código inicial; el resto de las pantallas va con
      `React.lazy` en `src/App.tsx`, que además las descarga por adelantado.
      Una pantalla nueva se declara allí igual que las demás, no con un import directo.
    - `neuroflex_hint` es una cookie auxiliar legible por el navegador (solo lleva el
      rol): permite mostrar el login al instante y adelantar `/auth/me`. **No es una
      credencial**; la sesión real es `neuroflex_session` (httpOnly). Nunca guardar en
      ella nada más.
    - Las lecturas de `/auth/me`, login, listado de estudiantes y banco de casos usan
      `.lean()` y solo los campos necesarios. Una ruta nueva que se pida seguido debe
      hacer lo mismo salvo que necesite métodos del documento (`save`, `toObject`).
    - Los desbloqueos de juegos recordados en memoria (`useGameAccess`) van por RUT y
      solo se recuerda un «sí»; un «no» siempre se consulta al servidor.
    - **Medir antes de culpar al código.** Toda respuesta de la API lleva la cabecera
      `Server-Timing` (`total`, `db`, y `arranque` si fue el primer pedido del proceso;
      se ve en DevTools → Network → Timing) y la consola del servidor avisa con
      `[lento]` cualquier pedido de 2 s o más (`lib/timing.ts`, aplicado en `dispatch`).
      `GET /api/auth/health` solo conecta la base: la página lo pide al abrirse sin
      sesión para calentar la función mientras la persona escribe su RUT.
    - `vercel dev` arranca cada pedido de nuevo (y vuelve a abrir Atlas): no sirve para
      medir. Para desarrollo local: `npm run dev:server` (un proceso que conserva la
      conexión) + `npm run dev`, con `VITE_API_URL=/api` en `.env.local`.
    - `lib/db.ts` abre una sola conexión por proceso, con límites de espera explícitos y
      sin dejar una promesa fallida en caché. Los handlers hacen sus lecturas
      independientes en un solo `Promise.all`; las lecturas pesadas de estadísticas se
      comparten 8 s (`reusePromise` en `lib/stats/loadData.ts`).
    - La tarjeta de Mini casos del menú del estudiante se muestra siempre: abierta si el
      servidor confirmó el desbloqueo, tenue con un mensaje amable dentro de la misma
      tarjeta si no (`GameCard` con `lockedMessage`; el texto vive en
      `unlockHint` de `gameCatalog.ts`). El servidor sigue exigiendo el desbloqueo.
    - El login y `/auth/me` devuelven `unlocked` (desbloqueos ya otorgados, solo lectura):
      la tarjeta de Mini casos aparece sin esperar `/games/access`.
    - Frontend: `src/lib/sharedRequest.ts` reutiliza lo ya pedido (catálogo de
      estadísticas, perfiles, listados, evolución) y comparte pedidos en vuelo; solo
      guarda respuestas correctas y se vacía al cambiar de persona o cerrar sesión.
      `prefetchOnce/takePrefetched` entrega lo adelantado UNA sola vez (progreso de
      juegos, banco de casos): se invalida al guardar o borrar progreso y no se adelanta
      si la cola de guardado está ocupada. Crear o editar estudiantes vacía `stats:`.
    - **Gráficos legibles (Estadísticas y Desempeño):** todo gráfico de `lib/stats` declara
      `xLabel`, `yLabel` y `unitLabel`; si su valor es la parte de un total (porcentaje de
      un grupo, reparto), cada serie lleva `part` y `total` (y el gráfico `partLabel` /
      `totalLabel`, p. ej. «que lo superaron» / «que jugaron el nivel»); si es un promedio o
      una mediana, `ns` dice con cuántos datos se calculó. El tooltip, la torta, las apiladas,
      la tabla en pantalla y la tabla descargable leen eso mediante `src/features/stats/utils/reading.ts`:
      un gráfico nuevo no necesita código de presentación propio.
    - `src/App.tsx` adelanta, según el rol, lo que verá la persona (listados del
      administrador, catálogo de estadísticas, Mi perfil) un instante después de entrar.

11. **Una sola sesión de estudiante y un solo lugar por juego** (no deshacer sin hablar):
    - `AuthUser.sessionId` guarda la única sesión vigente de un estudiante. Cada inicio de
      sesión (`lib/sessions.ts → startStudentSession`) genera uno nuevo y lo pone en el JWT
      (`sid`); un token con otro `sid` recibe `401` con `code: "session-replaced"` y el
      navegador vuelve al login explicando el motivo. Los administradores no se limitan.
      Se comprueba con `ensureCurrentSession` en `/auth/me`, `games/*`, `mini-cases*`,
      perfil y cambio de contraseña (un «sí» se recuerda 5 s por instancia; un «no» siempre
      se consulta). Un endpoint nuevo de estudiante debe llamarla.
    - `games/lease` + `GameLease`: quien abre un juego en último lugar «tiene» el juego
      (`useGameLease`, identificador propio por apertura). Todo lo que guarda (progreso,
      intentos, envío de mini casos) lleva `X-Game-Lease` y el servidor responde `409`
      (`game-opened-elsewhere`) si otro lugar lo abrió después; la pestaña que perdió
      muestra `GameLeaseLostNotice`. Se comprueba al volver a la pestaña y cada 15 s.
    - **Una página web no puede impedir capturas de pantalla.** `useScreenshotDeterrents`
      + `GAME_GUARD_CLASS` solo quitan las vías fáciles (menú contextual, selección,
      imprimir/PDF, «Impr Pant»). Impedirlas de verdad exige una app nativa (FLAG_SECURE en
      Android, detección en iOS).
    - «Guardar nivel y salir» (`SaveAndExitButton`): espera a que el último guardado llegue
      (`ProgressQueue.whenIdle` vía `useGameProgress().flush`) y lleva al menú; el nivel se
      retoma desde su inicio. Pide confirmación antes de salir (cuadro `<dialog>`; Esc o
      «Seguir jugando» siguen en el juego; el reloj del nivel no se detiene mientras se decide).
      En Mini casos se llama «caso» (`unit="caso"`).
    - Seriación: cuenta regresiva 3-2-1 (fase `countdown`) antes de cada intento, también al
      reanudar; el reloj del intento corre desde que se enciende el primer color.
    - Sonidos (`src/lib/gameSound.ts`, Web Audio sin archivos, silenciable; el silencio vive en
      `sessionStorage`). `unlockSound()` debe llamarse dentro de un toque.

12. **Conexión de nodos: errores permitidos** (no deshacer sin hablar; paridad cliente/servidor):
    - Error = cada choque + cada «Deshacer» + cada vez que se acorta o rehace una ruta tocándola
      (`routeRestarts`) + cada gesto que retrocede sobre el propio trazo (`backtrackGestures`, una
      vez por gesto, en el momento en que se borra la primera celda) + 2 por cada «Rehacer tablero»
      (peso 2 es un supuesto de diseño, `NODE_RESET_ERROR_WEIGHT`). Lo único que no cuenta es trazar
      bien. Resultados antiguos sin alguno de esos contadores cuentan 0 para ese término.
    - Permitidos = `max(4, ceil(pares × %))` con % = 100 (niveles 1–5), 80 (6–10), 60 (11–15): en la
      práctica 4,4,4,4,5 | 4,5,5,6,6 | 5,5,5,5,5 (`allowedErrors`). La tolerancia se calibró solo con
      jugadores simulados; no está validada con estudiantes reales. Subir la dificultad se hace aquí,
      no en los intentos (`NODE_MAX_TRIES = 3` no se toca). Al superarlos el
      intento se pierde al instante (fase `level-failed`) y se repite el MISMO tablero con los
      errores en cero: 3 intentos por nivel (`key` «3», «3.2», «3.3»). Sin pasar un nivel 1–10 la
      partida termina y se reinicia desde el 1; desde el 11 termina guardando el mejor nivel.
    - La pantalla previa al juego (`NodeConnectionGame`) explica en tres bloques cómo se juega, qué
      cuenta como error y el margen/intentos; el rango de errores sale de `LEVELS`, no se escribe a mano.
    - Reglas en `src/features/games/node-connection/rules.ts`, copia del servidor en
      `lib/nodeRules.ts`; `lib/nodeRulesParity.test.ts` exige que coincidan. El servidor recalcula
      `errors`, `errorsAllowed` y `passed` (`scoreNodeTry`); lo que diga el navegador se ignora.
    - Resultados guardados antes de esta regla (sin `passed`) cuentan como pasados.
    - `contentVersion` de nodos termina en `-r4` (`RULES_REVISION`): las partidas anteriores no son comparables. Hay que regenerar los datos de demostración.
    - Mini casos exige PASAR el nivel 10 de nodos (`mini-cases-v2`, evidencia `nodeMaxLevelPassed`).
    - Estadísticas: `lib/stats/chartsNodes.ts` (8 gráficos; «Planificación y pausas» y «Mejora entre partidas» ya no existen). «Tiempo por nivel» usa solo el primer
      intento pasado (`isFirstTryTime`). «Estudiantes estancados» = no pasaron el MISMO nivel en
      3 o más partidas consecutivas de un juego, siendo la última partida jugada la tercera de la
      racha; la lista dice de qué juego se trata (`chartsLists.ts`).

13. **Mis puntuaciones (estudiante)** — `GET /api/student/scores` (`lib/handlers/student/scores.ts`,
    cálculo puro en `lib/studentScores.ts`, pantalla en `src/features/student/`):
    - Nada depende del tiempo (ni puntos, ni insignias, ni gráficos): medir rapidez presiona.
    - Puntos por nivel superado (Seriación y Nodos): 10 + 5 si fue al primer intento + 5 si fue sin
      fallar (todos los colores / cero errores). Mini casos: 3 por paso en su lugar + 8 por orden
      perfecto. Se cuenta lo MEJOR de cada nivel o caso entre todas las partidas: los puntos nunca
      bajan y repetir un nivel no regala puntos.
    - Rangos (`RANKS`, también en la respuesta de `/student/scores` para el «?» de «Tu rango»): Chispa 0,
      Destello 100, Llama 300, Estrella 550, Constelación 800 (el máximo teórico ronda 1000 puntos).
    - 34 insignias en 5 niveles de dificultad (Primeros pasos, Constancia, Dominio, Experto,
      Maestría), definidas en `lib/studentBadges.ts`; se calculan al vuelo, nunca se guardan. Con umbrales
      altos a propósito: un estudiante que pasa 10 niveles de Seriación y los 15 de Nodos sin fallar
      debe quedar con ≤ 13 de 34 (`studentBadges.test.ts` lo exige). «Racha impecable» = ≥ 10 niveles
      distintos, todos al primer intento (`FLAWLESS_RUN_LEVELS`). Las insignias por días usan los días
      distintos de juego en hora de Chile (`daysPlayed`). Los umbrales no están validados con estudiantes reales.
      «Próxima meta» = la no lograda con mayor avance (a igual avance, la de nivel más bajo).
    - Mini casos: la gráfica lista TODO el banco (los casos no se pueden retirar); los no jugados
      salen como «Sin jugar», para que quien jugó pocos y los acertó no parezca perfecto.
    - Cada tarjeta de la pantalla se expande y colapsa (`ScoreCard`, `aria-expanded`), salvo la
      del rango. Nacen colapsadas, excepto «Tu resumen» y «Puntos por juego» (`defaultOpen`). Las
      explicaciones van tras un «?» (`HelpToggle`, 44 px): la lista de rangos junto a «Tu rango» y
      «¿Cómo se ganan los puntos?» junto a «Tu próxima meta».
    - Panel admin, Estadísticas > General: la tarjeta «Máximo logro» (`lib/stats/topScores.ts`)
      usa el mismo cálculo y abre el ranking (puesto, estudiante, RUT, universidad, paralelo,
      jornada, edad, puntos, rango, insignias). Se descarga en PDF (listas de las tarjetas) y en
      Excel: una hoja con la tabla del gráfico y una hoja por lista (`cardListSheets`).
    - Solo lee los datos del estudiante de la sesión (el RUT nunca viene de la solicitud).

14. **Panel de estadísticas del administrador** (`src/features/stats/`, `lib/stats/`):
    - Solo hay dos secciones: «Juego» y «Gráfico». Dentro de «Gráfico» van solo las opciones propias del
      gráfico (`ChartSettings`). Comparar NO está en la selección: es una barra (`CompareBar`) justo
      encima del gráfico, con un botón «Comparar» y lo que se compara como un chip con «×»
      (`activeChips`). La barra solo existe en los gráficos que se pueden comparar. El botón abre una hoja
      (`CompareSheet`, `<dialog>`: sube desde abajo en el celular, se centra en pantallas grandes) que
      edita una copia y entrega todo junto con «Aplicar». Con un gráfico a la vista, aplicar o quitar el
      chip lo recalcula al instante sin plegar la selección ni mover la pantalla (`applyCompare` en
      `StatsPage`). **No hay filtros de ningún tipo** (se quitaron «Cómo verlo», «Filtros» y la pestaña
      «Filtrar»): lo único que acota es elegir qué valores de lo comparado entran. Por eso al aplicar solo
      se guardan los valores de las características comparadas, y los gráficos que son listas
      (`compare: false`) no se pueden acotar.
    - Comparar = una o varias características a la vez (hasta 3). La primera viaja como `groupBy` y las
      demás como `alsoBy`; cada combinación existente es un grupo («UVM · Femenino»), con tope de 7
      grupos y el resto en «Otros» (`groupByCombination` en `pipeline.ts`). El dispositivo va solo,
      igual que «Estudiantes específicos» y «Rangos de fechas». Los valores que se comparan se eligen en
      la misma hoja.
    - Gráficos de perfil (`profileOnly`): «Intentos para superar un nivel» y «Mejora entre partidas» de
      Seriación solo existen en el desempeño del estudiante; no están en el catálogo del panel.
    - «Dónde fallan primero»: la secuencia se divide en 5 partes iguales (el último color siempre cae en
      la 5.ª) y la opción «Mostrar» da una tabla con la parte donde más falla cada estudiante.
    - «Alternativas que más fallan» (Mini casos, `chartsMiniCases.ts`): por caso, % de veces que cada paso
      se ubicó mal, lugar donde más lo ponen y lista de estudiantes (tarjetas con listas, vista Tabla).
      Pide a la base las métricas `placements` y `options` solo para este gráfico (`EXTRA_METRICS`).
      Su PDF lleva solo las tablas (`pdfListsOnly`, sin el dibujo de las tarjetas); cada lista agrega al
      título una aclaración (`note`: dónde debía ir, dónde la ponen y el % de PARTIDAS que la ubicó mal).
      Las tablas del PDF se rasterizan a 2× (`LIST_PIXEL_RATIO`) para que no pese ni tarde de más.
    - Los ejes muestran el número completo con separador de miles (nunca «K»).
    - Desempeño > «Partida a partida»: cada fila trae un icono que abre, en el mismo recuadro, los datos
      de la partida (`GET /api/admin/stats/students/:rut/partidas/:attemptId`, `lib/stats/partidaDetail.ts`):
      colores pedidos frente a marcados (Seriación), errores y orden de unión (Nodos) u orden correcto
      frente al elegido (Mini casos), más el tiempo por nivel. «Volver» regresa a la lista y la impresora
      baja solo esos datos en PDF.
    - «Alternativas que más fallan» se puede comparar por grupos: cada caso muestra un bloque por grupo
      (color del grupo) y la tabla agrega la columna «Grupo». Sin comparar, nada cambia. Son 25+ casos por
      varios grupos, así que los bloques no van como botones sueltos: un panel plegable (`GroupPanel`,
      resultado con `groupPanel: "Mini casos"`) agrupa casillas por «Mini Caso N» y trae «Quitar todos: X»,
      «Poner todos: X», «Solo X» y «Mostrar todos» (X = un grupo, p. ej. UVM). Cada tarjeta lleva `group`
      («Mini Caso N - grupo») y `subgroup` (el grupo); la tabla (`table.rowGroups`) sigue la selección
      (`subgroupsOf`, `toggleSubgroup`, `showOnly`, `withoutGroups` en `utils/groups.ts`).
    - Región y comuna son dimensiones de comparación (`comuna`, ya no «ciudad»).

15. **Mini casos: banco, título, imagen y sonido** (no deshacer sin hablar):
    - Cada `MiniCase` tiene `title` (solo el nombre del área, «Área de Detección Temprana»; **nunca** se guarda
      «Mini Caso N»), `imageKey` (dibujo del catálogo) y los textos de siempre. El banco (`GET /api/mini-cases`)
      entrega `title` e `imageKey` (si falta, `aula`), jamás `correctStep`. **El juego muestra solo el nombre**
      (sin «Mini Caso») en la lectura, el ordenamiento y el resultado, y el estudiante sigue viendo «Caso N de M»
      por posición en su partida. **El administrador ve «Mini Caso N: nombre»**, con N tomado de `caseKey`
      (`caso-N`); ese rótulo se arma al mostrar, no se guarda. Los casos 1–10 llevan el nombre de las áreas del
      documento «JUEGOS ABSTRACTOS - FE»; los demás, el que les puso el administrador.
    - El resultado rotula el texto como «Retroalimentación». La alerta de cambio no repite «¡Alerta de
      Cambio!» si el texto ya lo trae (`alertText.ts`).
    - Distractor: 4 s (`DISTRACTOR_MS`) la imagen del caso y un sonido, exactamente los mismos 4 s. Solo hay
      3 sonidos (`lluvia`, `olas`, `campanillas`, sintetizados en `audio/distractorSounds.ts`), elegidos al
      azar cada vez, con entrada y salida graduales y volumen bajo. Respeta el botón de silencio del juego
      (`SoundToggle`, `audibleContext()` de `src/lib/gameSound.ts`). El registro de la partida guarda en
      `distractorMotif` la clave de la imagen y en `distractorSound` el nombre del sonido, o `silenciado` si
      no se oyó. Partidas anteriores guardaron motivos y sonidos del diseño viejo (pixel-art, 9 sonidos).
    - Catálogo de 20 dibujos SVG sin texto ni personas: claves en `lib/miniCaseImages.ts` y
      `src/config/miniCaseImages.ts` (un test exige que coincidan, y que cada clave tenga dibujo en
      `features/games/mini-cases/images/scenes.tsx`). Para agregar uno: dibujo en `scenes.tsx` + clave en los dos
      catálogos.
    - Administración: página «Mini casos» (`ROUTES.ADMIN_MINI_CASES`, menú del administrador). Lista, alta y
      edición en `POST /api/admin/mini-cases` (`lib/miniCaseInput.ts` valida). Las 4 alternativas se escriben
      en el orden **correcto** (la 1.ª va en el paso 1) y el juego las baraja. Sin `caseKey` se crea el
      siguiente `caso-N`. Al editar, las alternativas **conservan su `optionKey`** (los resultados y las
      estadísticas las usan) y las secuencias alternativas se conservan si no se envían. **Un caso no se puede
      retirar** (ni temporal ni definitivamente): `MiniCase` no tiene `enabled` y el formulario no tiene casilla.
    - Los casos no tienen versión de contenido: `MINI_CASES_CONTENT_VERSION` es una constante
      (`"mini-cases"`). Editar un caso no separa las partidas anteriores de las nuevas.
    - Banco inicial: `lib/miniCasesSeed.ts` (25 casos; un test valida su estructura). **Se carga solo**:
      `connectDB()` ejecuta `runStartupTasksOnce()` (`lib/startupTasks.ts`, una vez por proceso, reintenta si
      falla) y `ensureBaseMiniCases()` inserta con `$setOnInsert` los que falten por `caseKey`, así que
      **nunca pisa una edición del administrador**. Solo corrige el título cuando falta, está vacío, es
      provisional o empieza con «Mini Caso», y el `imageKey` cuando falta. Ya no hay que correr ningún script
      de carga (se eliminó `server-scripts/seedMiniCases.ts`).
      Su clave de respuesta del documento lista NÚMEROS de alternativa en orden cronológico (3-2-1-4 = la
      alternativa 3 va primero); el `correctStep` de cada alternativa es su posición en esa lista.
    - Tareas de arranque de una sola vez: ayudante `once(name, task)` que deja la marca en la colección
      `migrations`. La primera es `ciudad-a-comuna` (renombra el campo `ciudad` → `comuna` en la ficha de
      cada estudiante y en `student.ciudad` de cada partida; la comuna antigua que no está en la lista se
      conserva tal cual).

16. **Inicio del estudiante** (`ROUTES.STUDENT`): página con el nombre del proyecto, su financiamiento y el
    equipo (`src/config/projectInfo.ts`). Las fotos del equipo no se suben desde la app: se dejan en
    `public/equipo/` (ver `LEEME.txt`). Los juegos están en `ROUTES.STUDENT_GAMES`.

17. **Ficha del estudiante:** jornada (`studyShift`: diurna/vespertina) y 5 paralelos. En el alta manual,
    «Universidad» va antes que «Paralelo». El estudiante puede editar correo, fecha de nacimiento y jornada
    desde su perfil con un solo lápiz (`PATCH /api/profile/:rut/contact`); también región y comuna.
    - **Región y comuna** son listas cerradas: 16 regiones y 346 comunas (listado oficial de la SUBDERE,
      tomado del paquete `@clregions/data` y contrastado con la Wikipedia «Comunas de Chile»). Viven en
      `lib/communes.ts` (servidor) y `src/config/communes.ts` (navegador), y `lib/communes.test.ts` exige
      que las dos copias coincidan. La comuna debe pertenecer a la región (`reconcilePlace` en
      `lib/studentFields.ts`); al cambiar de región se borra la comuna que ya no corresponde. El campo se
      llama `comuna` en todos lados (`Student.comuna`, `GameAttempt.student.comuna`, dimensión `comuna`).
      Una comuna antigua escrita a mano que no está en la lista se conserva en la base, pero el formulario
      la muestra como «Seleccionar».
    - **Nunca hay valor por defecto en datos que el estudiante completa:** jornada, región y comuna parten en
      «Seleccionar» (la comuna deshabilitada hasta elegir región) si la ficha no los tiene. Componente
      compartido: `components/forms/RegionCommuneFields`.
    - **Tabla de estudiantes del administrador:** columnas Universidad y Edad; se ordena tocando el título de
      la columna (como las carpetas de Windows: la primera vez ascendente, de nuevo invierte). Por defecto,
      edad de mayor a menor; los sin dato van siempre al final y el desempate es el apellido. En el celular
      (tarjetas) hay un selector «Ordenar por». Las personas de **45 años o más** salen en amarillo
      (`text-yellow-300`) con la marca de texto «45+» (el color solo no es accesible). Lógica en
      `features/admin/utils/studentTable.ts`.

---

## 4. Arquitectura por responsabilidades

Flujo obligatorio, en un solo sentido:

    Página / Componente
        ↓
    Action        ← punto de entrada de la feature
        ↓
    Service       ← reglas de negocio
        ↓
    Repository    ← única puerta a los datos
        ↓
    DataSource    ← hoy array en memoria, mañana MongoDB

Un componente **nunca** llama a un repositorio ni a un datasource.
Un servicio **nunca** importa React.

### Carpetas

    src/
      components/        UI reutilizable sin lógica de negocio
        ui/              Button, Input, Field, InputGroup, Label, Separator, Textarea
        forms/           RutInput
        auth/            ProtectedRoute, PublicOnlyRoute
      config/            routes.ts, env.ts
      context/           auth.context.ts, AuthProvider.tsx, useAuth.ts
      data/              datasources (mock del backend)
      features/          auth, student, admin
        <feature>/
          actions/       entrada desde la UI
          components/    UI propia de la feature
          pages/
          schemas/       Zod
          services/      reglas de negocio
      layouts/           AuthLayout y (futuro) layouts privados
      lib/               axios, cn
      repositories/      auth, student, admin  (compartidos entre features)
      services/          session.service, profile.service  (transversales)
      types/             dominio compartido
      utils/             rut.ts

**Los datasources son arrays mutables en memoria.** `authRepository.create()` hace
`push` sobre `authUsers`, y `studentRepository.markAsRegistered()` muta el objeto
`Student`. El estado **persiste entre llamadas** dentro de una misma sesión del
navegador y se reinicia al recargar. Cualquier test debe aislar o restaurar ese estado.

**Por qué `repositories/` es raíz y no vive dentro de `features/auth/`:**
el registro necesita `AuthRepository` y `StudentRepository` a la vez, y el dashboard
del estudiante necesitará el segundo. Dentro de una feature obligaría a
importaciones cruzadas entre features.

---

## 5. Convenciones

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes | PascalCase | `LoginPage.tsx` |
| Servicios / repos / schemas | `nombre.tipo.ts` | `login.service.ts` |
| Tipos y hooks | camelCase / kebab-case | `auth-user.ts`, `useAuth.ts` |
| Repositorios | clase + instancia exportada en minúscula | `export const authRepository` |
| Servicios transversales | objeto literal | `export const sessionService` |
| Imports internos | siempre alias `@/` | `import { ok } from "@/types"` |
| Tipos en imports | `import type` obligatorio | `verbatimModuleSyntax` está activo |

`tsconfig.app.json` corre con `strict: true`, `noUncheckedIndexedAccess`,
`noUnusedLocals`, `erasableSyntaxOnly`. **No se desactivan.**

---

## 6. Entidades

    AuthUser   id, rut, password, role, enabled          → puede iniciar sesión
    Student    rut, firstName, paternalLastName, maternalLastName, birthDate,
               entryYear, entrySemester, studyShift, works, enabled, registered,
               email, avatarId
    Admin      rut, firstName, paternalLastName, maternalLastName, enabled,
               email, avatarId
    SessionUser  id, rut, role, displayName, avatarId   → lo único que va al navegador

`AuthUser` y la ficha (`Student`/`Admin`) se unen por **`rut`**.
Un estudiante existe en la nómina desde que la universidad lo carga,
pero solo aparece en `authUsers` **después de registrarse**.

`email` es dato de contacto de la ficha, nunca credencial: `AuthUser` no lo
tiene y el login sigue siendo solo por RUT. `avatarId` referencia el mapa de
iconos+color en `src/config/avatars.ts` (`AVATARS`); todavía no hay carga de
imágenes propias. El nombre de
la carrera (`"Educación Diferencial"`) vive como constante suelta en
`src/config/career.ts` (`CAREER_NAME`) — no es campo de ninguna entidad.

### Respuestas de servicio

    ApiResponse<T> = ApiSuccess<T> | ApiFailure

Unión discriminada por `success`. Se construyen con los helpers `ok()` y `fail()`.

---

## 7. Flujo de autenticación

**Login**

    rut + password
      → normalizeForDatabase(rut)
      → authRepository.findByRut
      → si no existe O password no coincide: mensaje GENÉRICO
        (distinguir ambos casos permite enumerar usuarios; los RUT son predecibles)
      → verificar account.enabled
      → profileService.findProfile(rut, role)  → displayName
      → SessionUser → sessionService.save → AuthContext
      → redirección por DASHBOARD_BY_ROLE

**Registro**

    ¿RUT en la nómina de estudiantes?  → no: rechazar
    ¿student.enabled?                  → no: rechazar
    ¿student.registered o ya hay cuenta? → sí: rechazar
    → authRepository.create({ rut, password, role: "student" })
    → studentRepository.markAsRegistered(rut)

**Sesión**

`src/services/session.service.ts` es el **único** archivo del proyecto que toca
`localStorage`. Guarda un `SessionUser` — nunca la contraseña.
Cuando exista JWT, el token se guarda aquí y el resto de la app no se entera.

`SESSION_KEY` se exporta solo para `session.service.test.ts`; ningún otro
archivo debe usarla para acceder a `localStorage` directamente.

**Memoria de pantalla.** `src/lib/tabMemory.ts` es el único archivo que toca
`sessionStorage`: guarda, solo en esa pestaña, lo que una pantalla debe recordar si el navegador
recarga la página (en el celular, al apagar y encender la pantalla): qué se eligió en
Estadísticas, a qué estudiante se miraba en Desempeño. Escribe con 300 ms de espera y de
inmediato al ocultarse la página (`visibilitychange`, `pagehide`). Reglas: solo estado de pantalla,
**nunca** credenciales ni resultados calculados (se vuelven a pedir al servidor); cada
memoria lleva `VERSION` y `owner` (RUT) y se descarta si no coincide; `AuthProvider` la vacía
al cerrar sesión y cuando entra otra persona.

`AuthProvider` expone `isLoading` durante la rehidratación para que
`ProtectedRoute` no redirija al login antes de saber si hay sesión. Solo está en `true`
cuando existe la cookie auxiliar `neuroflex_hint`; sin ella el login se muestra de
inmediato y `/auth/me` se confirma en segundo plano (`src/lib/restoreSession.ts`).

---

## 8. Decisiones tomadas

✅ RUT como identificador · sesión mínima en el navegador · repositorios raíz ·
`strict` activado · mensaje de login genérico · `DASHBOARD_BY_ROLE` tipado con
`Record<UserRole, string>` para que agregar un rol sea un error de compilación.

❌ **NO** hashear contraseñas en el frontend. El cliente controla el código: el hash
   se convierte en la contraseña efectiva. Es responsabilidad exclusiva del backend.
❌ NO login por email · NO borrar usuarios · NO `User` genérico ·
   NO acceso directo al datasource · NO nombre completo en un campo · NO cohortes como entidad.

⚠️ **Pendientes de decidir antes del backend:**

1. **Dónde vive el JWT.** `localStorage` es simple pero vulnerable a XSS; cookie
   `httpOnly` es más segura pero condiciona dominio, CORS y despliegue.
2. **Unicidad de RUT entre nóminas.** Hoy nada impide que un mismo RUT esté en
   `students` y en `admins` a la vez; `registerService` solo consulta
   `students` y crearía una cuenta de estudiante para alguien que ya es administrador.
   Se ataja con una restricción de unicidad en la base de datos, no en el servicio.
   Riesgo real cuando el administrador cargue nóminas por Excel (Fase D).

---

## 9. Hoja de ruta

**Fase A — Autenticación** ✅ completa y validada manualmente
tipos, datasources tipados, 4 repositorios, session.service, profile.service,
AuthContext con rehidratación, login, registro, logout, rutas por rol, AuthLayout.
Probados los 10 casos: los 3 logins por rol, registro exitoso, RUT fuera de nómina,
matrícula inactiva, DV inválido, persistencia tras recarga, redirección con sesión
abierta y rebote de rol incorrecto.

**Fase B — Base**
1. Vitest + tests de `utils/rut.ts` y de `registerService` (4 ramas de negocio)
2. Layouts privados: Sidebar, Navbar, Breadcrumb, Avatar
3. Dashboards reales por rol

**Fase C — Corazón del producto**
4. Juego 1: seriación de colores (autocontrol + memoria de trabajo)
5. Juego 2: conexión de nodos sin cruce (planificación + flexibilidad cognitiva)
6. Mini casos: 5 fases (lectura 10s → desvanecimiento → distractor de 4s (imagen + sonido) →
   giro inesperado → ordenar 1-4)
7. Métricas: tiempo, errores, intentos, nivel, desbloqueos

**Fase D — Gestión**
8. Panel de estadísticas del administrador: gráficos, filtros, comparación por cohorte
9. Panel administrador: carga masiva Excel, gestión de administradores/estudiantes/casos
10. Reportes y exportación a PDF/Excel

**Fase E — Producción**
11. Backend + MongoDB Atlas: solo cambia el cuerpo de los 4 repositorios
    y de `session.service.ts`. Ningún componente se toca.
12. Seguridad, optimización, despliegue.
