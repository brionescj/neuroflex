type SeedOption = { optionKey: string; text: string; correctStep: 1 | 2 | 3 | 4 };
export type SeedCase = {
  caseKey: string;
  /** Solo el nombre del area, sin «Mini Caso N»: es lo que ve el estudiante. El admin lo ve con el prefijo «Mini Caso N: ». */
  title: string;
  /** Dibujo del catalogo (lib/miniCaseImages.ts) que se muestra como distractor. */
  imageKey: string;
  baseText: string;
  twistText: string;
  promptText: string;
  feedback: string;
  options: [SeedOption, SeedOption, SeedOption, SeedOption];
  /**
   * Otras secuencias que tambien son correctas, ademas de la que marcan los
   * correctStep: cada una lista las 4 optionKey en orden.
   */
  alternateOrders?: string[][];
};

/**
 * Los 25 casos base del banco. Al arrancar el servidor (lib/startupTasks.ts) se agregan a la base los
 * que falten, por su clave (caseKey): no duplica nada, no pisa los textos ya corregidos desde el panel
 * de administracion ni toca los resultados guardados. Los casos 1 a 10 vienen del banco original; el 11
 * al 25 se agregaron despues. Los nombres de area salen del documento «JUEGOS ABSTRACTOS - FE».
 */
export const MINI_CASES_SEED: SeedCase[] = [
  {
    caseKey: "caso-1",
    title: "Área de Detección Temprana",
    imageKey: "aula",
    baseText: "Durante las observaciones en el aula de 1.° básico, detectas que un estudiante presenta un desfase significativo en la adquisición del código lectoescrito en comparación con sus pares, mostrando frustración extrema.",
    twistText: "¡Alerta de Cambio! La familia te informa en una entrevista rápida que el estudiante no asistió a la educación parvularia previa y el profesor de aula exige su derivación inmediata a escuela especial hoy mismo.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción que resguarda la igualdad y la correcta detección pedagógica:",
    feedback: "La flexibilidad cognitiva te permite frenar la presión del profesor (impulso de derivación) y planificar un levantamiento de información pedagógica riguroso antes de etiquetar al estudiante.",
    options: [
      {
        optionKey: "caso-1-a",
        text: "Iniciar un periodo de respuesta a la intervención (RTI) con estrategias diversificadas en el aula común para evaluar su evolución adaptativa.",
        correctStep: 4,
      },
      {
        optionKey: "caso-1-b",
        text: "Realizar una evaluación pedagógica diagnóstica informal y registrar observaciones cualitativas del desempeño del estudiante.",
        correctStep: 2,
      },
      {
        optionKey: "caso-1-c",
        text: "Sostener una reunión de co-enseñanza con el profesor de aula para unificar criterios de altas expectativas y evitar la patologización del desfase.",
        correctStep: 3,
      },
      {
        optionKey: "caso-1-d",
        text: "Analizar los antecedentes escolares y familiares previos para contextualizar el nivel de estimulación inicial del niño.",
        correctStep: 1,
      },
    ],
  },
  {
    caseKey: "caso-2",
    title: "Área de Co-enseñanza",
    imageKey: "mesa-equipo",
    baseText: "Te integras a un aula de 2.° básico bajo la modalidad de co-enseñanza. El profesor de aula regular manifiesta que prefiere que tú te encargues exclusivamente de los tres estudiantes con Necesidades Educativas Especiales (NEE) al fondo de la sala.",
    twistText: "¡Alerta de Cambio! El equipo directivo te informa que el aula regular tiene un 40% de estudiantes con bajo desempeño general y el profesor básico se encuentra agobiado, rechazando cualquier reunión de planificación fuera del horario de clases.",
    promptText: "Diseña la ruta estratégica ordenando del 1 al 4 las acciones para resguardar la inclusión e igualdad en el aula sin generar conflictos profesionales:",
    feedback: "Modificar la propuesta inicial de co-enseñanza para adaptarla al agobio del docente demuestra una alta flexibilidad cognitiva y una planificación realista basada en las condiciones del entorno.",
    options: [
      {
        optionKey: "caso-2-a",
        text: "Proponer el uso de organizadores gráficos y andamiajes visuales universales (DUA) aplicables a todo el curso durante la clase compartida.",
        correctStep: 2,
      },
      {
        optionKey: "caso-2-b",
        text: "Presentar modelos breves de Co-enseñanza de Estaciones o Alternativa que se ejecuten directamente en el aula sin requerir tiempo extra de preparación.",
        correctStep: 3,
      },
      {
        optionKey: "caso-2-c",
        text: "Observar la dinámica general del 40% del curso para identificar las barreras comunes del entorno antes de intervenir.",
        correctStep: 1,
      },
      {
        optionKey: "caso-2-d",
        text: "Evaluar co-laborativamente el impacto de los apoyos visuales en el desempeño de todo el grupo al finalizar la semana.",
        correctStep: 4,
      },
    ],
  },
  {
    caseKey: "caso-3",
    title: "Área de Estrategias Inclusivas (DUA)",
    imageKey: "patio",
    baseText: "Al planificar una experiencia de aprendizaje para un grupo de 1.° básico, constatas que las actividades propuestas exigen que los niños permanezcan sentados escuchando una explicación teórica por 40 minutos seguidos.",
    twistText: "¡Alerta de Cambio! El día de la actividad llueve intensamente en la zona, suspendiendo los recreos en el patio, lo que duplica la inquietud motora natural y los niveles de distracción de todo el grupo de estudiantes.",
    promptText: "Reestructura la planificación original ordenando del 1 al 4 los pasos para diversificar los medios de compromiso y participación bajo esta contingencia climática:",
    feedback: "El cambio climático intra-aula exige desechar el plan rígido de escritorio (Flexibilidad) y secuenciar apoyos de movimiento regulado (Planificación) para mantener el autocontrol grupal.",
    options: [
      {
        optionKey: "caso-3-a",
        text: "Dividir los 40 minutos teóricos en bloques de 10 minutos intercalados con pausas activas dentro de la sala de clases.",
        correctStep: 2,
      },
      {
        optionKey: "caso-3-b",
        text: "Implementar estaciones de trabajo multisensorial con materiales concretos distribuidos en las mesas del aula.",
        correctStep: 3,
      },
      {
        optionKey: "caso-3-c",
        text: "Monitorear el nivel de fatiga o frustración de los estudiantes durante la ejecución para reajustar los tiempos sobre la marcha.",
        correctStep: 4,
      },
      {
        optionKey: "caso-3-d",
        text: "Entregar instrucciones breves y claras apoyadas por el uso de recursos visuales proyectados en la pizarra.",
        correctStep: 1,
      },
    ],
  },
  {
    caseKey: "caso-4",
    title: "Área de Apoyos Específicos (TEA)",
    imageKey: "rutina-visual",
    baseText: "Un estudiante de 2.° básico diagnosticado con Trastorno del Espectro Autista (TEA) presenta desregulación emocional severa cada vez que se realizan transiciones abruptas entre las asignaturas de la jornada.",
    twistText: "¡Alerta de Cambio! Hoy se suspenden las clases regulares a mitad de la mañana por un simulacro de emergencia institucional no programado, rompiendo toda la rutina habitual de la escuela.",
    promptText: "Ordena del 1 al 4 las acciones urgentes de mediación pedagógica para resguardar la estabilidad y el autocontrol del estudiante ante este cambio drástico:",
    feedback: "Las emergencias escolares anulan las planificaciones a largo plazo. La flexibilidad cognitiva te permite priorizar la anticipación relámpago (paso 2) para proteger la autorregulación del niño.",
    options: [
      {
        optionKey: "caso-4-a",
        text: "Acompañar al estudiante físicamente durante el ejercicio, modelando conductas de respiración profunda y contención.",
        correctStep: 3,
      },
      {
        optionKey: "caso-4-b",
        text: "Utilizar un pictograma o tarjeta visual exprés para anticiparle que sonará una alarma pero que se trata de un juego de seguridad.",
        correctStep: 1,
      },
      {
        optionKey: "caso-4-c",
        text: "Evaluar el nivel de estrés del estudiante post-simulacro antes de reincorporarlo a las actividades comunes del aula.",
        correctStep: 4,
      },
      {
        optionKey: "caso-4-d",
        text: "Ubicar al estudiante en un punto estratégico de la fila, alejado de los ruidos de amplificación más intensos de la zona de seguridad.",
        correctStep: 2,
      },
    ],
  },
  {
    caseKey: "caso-5",
    title: "Área de Evaluación Inclusiva",
    imageKey: "cuaderno",
    baseText: "Aplicas un instrumento de evaluación de comprensión lectora en 2.° básico. Notas que un estudiante responde correctamente las preguntas iniciales, pero se equivoca sistemáticamente en las finales debido a que olvida las instrucciones complejas entregadas al inicio.",
    twistText: "¡Alerta de Cambio! El estudiante te manifiesta de manera espontánea que le genera mucha vergüenza levantar la mano para pedir ayuda frente a sus compañeros de curso.",
    promptText: "Diseña una estrategia discreta de andamiaje para la memoria de trabajo, ordenando del 1 al 4 las siguientes acciones metodológicas:",
    feedback: "Al descubrir la variable emocional (vergüenza), debes flexibilizar el diseño de la evaluación ordinaria, planificando una secuencia que andamie la memoria de trabajo sin exponer socialmente al estudiante.",
    options: [
      {
        optionKey: "caso-5-a",
        text: "Monitorear discretamente pasando por su puesto para verificar la transición entre los pasos del instrumento.",
        correctStep: 4,
      },
      {
        optionKey: "caso-5-b",
        text: "Entregar una lista de cotejo visual (checklist de pasos en miniatura) pegada de forma sutil en una esquina de su mesa de trabajo.",
        correctStep: 3,
      },
      {
        optionKey: "caso-5-c",
        text: "Segmentar la entrega del instrumento, facilitándole una sola hoja o instrucción a la vez en lugar del cuadernillo completo.",
        correctStep: 2,
      },
      {
        optionKey: "caso-5-d",
        text: "Explicar al estudiante de forma individual y privada la secuencia de la tarea antes de iniciar la aplicación general.",
        correctStep: 1,
      },
    ],
  },
  {
    caseKey: "caso-6",
    title: "Área de Interculturalidad e Igualdad",
    imageKey: "globo",
    baseText: "Un estudiante extranjero se incorpora a 1.° básico. El equipo docente regular asume erróneamente que requiere ser derivado a una escuela especial porque confunde ciertos modismos locales y posee un ritmo de vocabulario diferente.",
    twistText: "¡Alerta de Cambio! La escuela recibe la instrucción de aplicar una prueba estandarizada comunal de lenguaje esta misma semana, y la dirección exige que todos los estudiantes nuevos rindan el test bajo las mismas condiciones.",
    promptText: "Para evitar una discriminación sistémica y asegurar un enfoque de igualdad intercultural, ordena del 1 al 4 las medidas prioritarias de gestión pedagógica:",
    feedback: "La flexibilidad institucional te obliga a responder a la exigencia del test, pero tu planificación debe anteponer apoyos de acceso lingüístico inmediatos (pasos 2 y 3) para garantizar la equidad del proceso.",
    options: [
      {
        optionKey: "caso-6-a",
        text: "Analizar cualitativamente los errores cometidos en el test, discriminando si corresponden a barreras culturales o a un desafío del neurodesarrollo.",
        correctStep: 4,
      },
      {
        optionKey: "caso-6-b",
        text: "Implementar un glosario visual de modismos locales equivalentes en la sala de clases para uso de todo el grupo curso durante la semana.",
        correctStep: 1,
      },
      {
        optionKey: "caso-6-c",
        text: "Solicitar formalmente a la dirección de la escuela la contextualización de las palabras del instrumento que no correspondan al bagaje cultural del niño.",
        correctStep: 2,
      },
      {
        optionKey: "caso-6-d",
        text: "Mediar de forma personalizada durante la lectura de las instrucciones del test para asegurar la comprensión de los enunciados.",
        correctStep: 3,
      },
    ],
  },
  {
    caseKey: "caso-7",
    title: "Área de Co-regulación Emocional",
    imageKey: "bloques",
    baseText: "En un trabajo de rincones lúdicos en 1.° básico, un estudiante se frustra porque la torre de bloques de madera que planificó construir se cae repetidamente. Reacciona lanzando las piezas al suelo y negándose a continuar.",
    twistText: "¡Alerta de Cambio! Dos compañeros de su mesa se contagian de la frustración, comienzan a discutir entre ellos por el espacio del juego y la dinámica general del rincón colapsa.",
    promptText: "Para restablecer el autocontrol del entorno e implementar estrategias de flexibilidad cognitiva grupal, ordena del 1 al 4 los pasos de intervención mediadora:",
    feedback: "El colapso del grupo te obliga a desechar la contención individual (Flexibilidad) y pasar a una secuencia de planificación social (pasos 1 y 2) que recupere la autorregulación colectiva.",
    options: [
      {
        optionKey: "caso-7-a",
        text: "Reunir al rincón completo en un breve círculo de calma en el suelo para identificar comunitariamente la emoción de la frustración.",
        correctStep: 2,
      },
      {
        optionKey: "caso-7-b",
        text: "Guiar y modelar el codiseño de una estrategia colectiva de construcción donde cada niño asuma un rol específico en el ensamblaje.",
        correctStep: 3,
      },
      {
        optionKey: "caso-7-c",
        text: "Contener el foco inicial de tensión, retirando de forma pacífica las piezas lanzadas para despejar el espacio visual de la mesa.",
        correctStep: 1,
      },
      {
        optionKey: "caso-7-d",
        text: "Evaluar de manera conjunta el resultado de la nueva construcción, reforzando la persistencia y la tolerancia al error.",
        correctStep: 4,
      },
    ],
  },
  {
    caseKey: "caso-8",
    title: "Área de Co-enseñanza Matemática",
    imageKey: "matematicas",
    baseText: "Al revisar la evaluación diagnóstica de un 2.° básico, observas que el 40% del curso tiene serias dificultades para organizar los pasos requeridos al resolver problemas matemáticos simples, perdiéndose a la mitad del proceso.",
    twistText: "¡Alerta de Cambio! El profesor de aula te indica que los textos escolares oficiales de matemáticas llegaron incompletos y que no cuenta con material impreso de apoyo para la sesión de mañana.",
    promptText: "Diseña una estrategia andamiada de bajo costo y alto impacto en la planificación mental, ordenando del 1 al 4 las siguientes alternativas pedagógicas conjuntas:",
    feedback: "La falta de textos se supera con flexibilidad didáctica. Planificar el uso de soportes macro (la cartulina en la pared) andamia la función ejecutiva de organización en todo el grupo curso simultáneamente sin depender de insumos externos.",
    options: [
      {
        optionKey: "caso-8-a",
        text: "Modelar de manera explícita en la pizarra el uso de la secuencia de pasos con un problema matemático cotidiano del aula.",
        correctStep: 2,
      },
      {
        optionKey: "caso-8-b",
        text: "Dibujar un organizador gráfico de pasos simples (1.° Leo, 2.° Dibujo, 3.° Opero) en una cartulina grande visible para toda la sala de clases.",
        correctStep: 1,
      },
      {
        optionKey: "caso-8-c",
        text: "Monitorear de forma alternada los puestos de trabajo para retroalimentar la aplicación de la secuencia gráfica en los cuadernos comunes.",
        correctStep: 4,
      },
      {
        optionKey: "caso-8-d",
        text: "Solicitar a los estudiantes que transcriban u organicen de forma autónoma el problema del día utilizando la estructura de la cartulina.",
        correctStep: 3,
      },
    ],
  },
  {
    caseKey: "caso-9",
    title: "Área de Ruta de Derivación Interna",
    imageKey: "reunion-familia",
    baseText: "Un docente de aula regular te comenta preocupado que sospecha que un estudiante de 1.° básico presenta una Discapacidad Intelectual, fundamentando que el niño \"no sigue el ritmo del resto y se distrae con extrema facilidad\".",
    twistText: "¡Alerta de Cambio! El apoderado asiste a la escuela de forma defensiva, manifestando abiertamente su rechazo absoluto a que el psicólogo o el equipo PIE evalúen o toquen a su hijo debido a malas experiencias institucionales previas.",
    promptText: "Para resguardar el derecho a la educación, la igualdad de oportunidades y la correcta derivación legal, ordena del 1 al 4 los pasos éticos de la ruta:",
    feedback: "La negativa de la familia bloquea la ruta clínica directa (Flexibilidad). Debes planificar el andamiaje pedagógico exclusivo en el aula de clases común como primer paso ético indiscutible, antes de volver a intentar el acercamiento con la familia.",
    options: [
      {
        optionKey: "caso-9-a",
        text: "Implementar adaptaciones curriculares generales y de acceso (DUA) dentro del aula común que beneficien directamente el foco atencional del estudiante de forma natural.",
        correctStep: 1,
      },
      {
        optionKey: "caso-9-b",
        text: "Sistematizar y registrar evidencias cualitativas rigurosas sobre las respuestas del estudiante a las estrategias de intervención del aula regular.",
        correctStep: 2,
      },
      {
        optionKey: "caso-9-c",
        text: "Sostener una entrevista de escucha activa con el apoderado para validar sus temores, explicar el enfoque inclusivo y construir una alianza de confianza mutua.",
        correctStep: 3,
      },
      {
        optionKey: "caso-9-d",
        text: "Presentar las evidencias pedagógicas acumuladas al apoderado en una segunda reunión para fundamentar de manera transparente la necesidad de un apoyo multidisciplinario consentido.",
        correctStep: 4,
      },
    ],
    // El documento acepta dos secuencias: 1-2-3-4 y 3-1-2-4 (primero la
    // alianza con el apoderado, luego las adaptaciones y el registro).
    alternateOrders: [["caso-9-c", "caso-9-a", "caso-9-b", "caso-9-d"]],
  },
  {
    caseKey: "caso-10",
    title: "Área de Acceso Curricular (Proyectos)",
    imageKey: "laboratorio",
    baseText: "Para un proyecto de ciencias naturales en 2.° básico, los estudiantes deben seguir un manual de cuatro instrucciones sucesivas para armar un germinador. Un estudiante con desafíos severos en memoria de trabajo y planificación se muestra abrumado y comienza a desarmar el material de sus compañeros de mesa.",
    twistText: "¡Alerta de Cambio! Al intentar mediar la situación, el estudiante derrama accidentalmente toda la tierra y el agua de su grupo sobre la mesa, provocando la burla y las quejas de sus pares de equipo.",
    promptText: "Frente a esta crisis de autorregulación y para asegurar el acceso inclusivo del estudiante a la experiencia científica, ordena del 1 al 4 los pasos de intervención inmediata:",
    feedback: "El desastre físico en la mesa satura la memoria y el autocontrol del niño. Tu flexibilidad pedagógica te lleva a desactivar el foco de crisis mediante una tarea de orden práctica (paso 1), para luego planificar el reingreso estructurado a la meta científica (pasos 2 y 3).",
    options: [
      {
        optionKey: "caso-10-a",
        text: "Asignar al estudiante la tarea inicial de limpiar la mesa junto a ti como una acción colaborativa neutra que calme su nivel de estrés y frustración.",
        correctStep: 1,
      },
      {
        optionKey: "caso-10-b",
        text: "Entregarle una guía de pasos secuenciados de forma individual con apoyos visuales icónicos (tarjetas paso a paso) para reiniciar el armado del germinador.",
        correctStep: 3,
      },
      {
        optionKey: "caso-10-c",
        text: "Facilitarle un nuevo set de materiales de ciencias en un espacio despejado de la mesa, focalizándolo en ejecutar una sola instrucción simple a la vez.",
        correctStep: 4,
      },
      {
        optionKey: "caso-10-d",
        text: "Mediar en la dinámica social del equipo de pares, validando el accidente de manera empática y reordenando las tareas de limpieza del grupo de forma equitativa.",
        correctStep: 2,
      },
    ],
  },
  {
    caseKey: "caso-11",
    title: "Área de Adecuación Curricular en Matemáticas",
    imageKey: "matematicas",
    baseText: "En 3.° básico, un estudiante con discalculia presenta bloqueos severos al enfrentar problemas de operatoria tradicional, manifestando alta resistencia y frustración.",
    twistText: "¡Alerta de Cambio! El estudiante extravía su set de material concreto multisensorial y la normativa institucional exige una resolución estrictamente abstracta e inmediata en la pantalla.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción que resguarda la flexibilidad y el procesamiento numérico:",
    feedback: "La pérdida del material concreto satura la memoria y el autocontrol del estudiante. Tu flexibilidad pedagógica te lleva a analizar primero la consigna original (paso 3), reestructurar el texto (paso 2), aplicar el soporte gráfico alternativo (paso 1) y cerrar con la evaluación de desempeño (paso 4).",
    options: [
      {
        optionKey: "caso-11-a",
        text: "Permitir el uso temporal de un soporte gráfico digital alternativo (recta numérica interactiva) mientras se estabiliza el foco.",
        correctStep: 3,
      },
      {
        optionKey: "caso-11-b",
        text: "Reestructurar el problema escrito reduciendo su densidad sintáctica para facilitar la lectura inicial.",
        correctStep: 2,
      },
      {
        optionKey: "caso-11-c",
        text: "Analizar la consigna original retenida en la memoria para aislar el obstáculo en el procesamiento numérico.",
        correctStep: 1,
      },
      {
        optionKey: "caso-11-d",
        text: "Evaluar el desempeño del estudiante posterior a la aplicación del apoyo adaptado.",
        correctStep: 4,
      },
    ],
  },
  {
    caseKey: "caso-12",
    title: "Área de Lenguaje y Comunicación",
    imageKey: "biblioteca",
    baseText: "Durante la lectura comprensiva en 2.° básico, un alumno con TEL expresivo muestra fatiga extrema y omisión sistemática de nexos gramaticales en textos breves.",
    twistText: "¡Alerta de Cambio! Se interrumpe abruptamente la sesión por un simulacro de emergencia escolar, reduciendo a la mitad el tiempo operativo disponible.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "La interrupción por emergencia colapsa la memoria a corto plazo del alumno. Tu flexibilidad pedagógica te lleva a retener el nivel de lectura previo (paso 4) aplicando una pausa de regulación (paso 3), para luego ajustar la meta temporal (paso 2) y focalizar la mediación (paso 1).",
    options: [
      {
        optionKey: "caso-12-a",
        text: "Focalizar la mediación exclusivamente en la extracción de la idea principal mediante organizadores gráficos rápidos.",
        correctStep: 4,
      },
      {
        optionKey: "caso-12-b",
        text: "Ajustar la meta de comprensión al nuevo tiempo disponible en el aula tras la interrupción.",
        correctStep: 3,
      },
      {
        optionKey: "caso-12-c",
        text: "Aplicar una pausa breve de regulación emocional al retomar el trabajo en el aula.",
        correctStep: 2,
      },
      {
        optionKey: "caso-12-d",
        text: "Retener mentalmente el nivel de lectura alcanzado antes de la suspensión del bloque.",
        correctStep: 1,
      },
    ],
  },
  {
    caseKey: "caso-13",
    title: "Área de Conducta y Autorregulación",
    imageKey: "rincon-calma",
    baseText: "En 4.° básico, un estudiante en programa de integración (PIE) manifiesta resistencia severa frente a dinámicas grupales complejas y trabajo colaborativo espontáneo.",
    twistText: "¡Alerta de Cambio! El compañero designado como tutor par se ausenta imprevistamente por enfermedad, colapsando la estructura de apoyo mutuo establecida.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "La ausencia del tutor par rompe el esquema de trabajo y desafía el autocontrol del alumno. Tu flexibilidad pedagógica te lleva a recordar los parámetros esperados (paso 2) y asumir la mediación (paso 4), para luego reestructurar al trabajo individual (paso 1) y registrar los avances (paso 3).",
    options: [
      {
        optionKey: "caso-13-a",
        text: "Modificar la estrategia de agrupamiento hacia un formato de trabajo individual guiado de menor exigencia social.",
        correctStep: 3,
      },
      {
        optionKey: "caso-13-b",
        text: "Recordar los parámetros de la conducta esperada retenidos en la memoria operativa para evitar la frustración.",
        correctStep: 1,
      },
      {
        optionKey: "caso-13-c",
        text: "Registrar la respuesta conductual observada para el seguimiento y ajuste del PIE.",
        correctStep: 4,
      },
      {
        optionKey: "caso-13-d",
        text: "Asumir temporalmente la mediación directa para evitar una escalada conductual en el estudiante.",
        correctStep: 2,
      },
    ],
  },
  {
    caseKey: "caso-14",
    title: "Área de Trastorno del Espectro Autista (TEA)",
    imageKey: "rutina-visual",
    baseText: "Un estudiante con TEA nivel 1 en 5.° básico experimenta altos niveles de ansiedad ante un cambio imprevisto en la rutina establecida dentro del aula de recursos.",
    twistText: "¡Alerta de Cambio! El espacio de integración habitual se encuentra bloqueado por reparaciones de infraestructura, obligando a trasladarse a un patio altamente ruidoso.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "El cambio de espacio y el ruido ambiental saturan el procesamiento sensorial del estudiante. Tu flexibilidad pedagógica te lleva a retener la rutina base (paso 2) empleando un pictograma (paso 4), trasladar al alumno a un sector periférico (paso 1) y validar su emoción (paso 3).",
    options: [
      {
        optionKey: "caso-14-a",
        text: "Trasladar la sesión a un sector periférico y de menor estimulación sensorial en el patio.",
        correctStep: 3,
      },
      {
        optionKey: "caso-14-b",
        text: "Retener los elementos centrales de la rutina pedagógica que debían ajustarse al nuevo entorno.",
        correctStep: 1,
      },
      {
        optionKey: "caso-14-c",
        text: "Validar el estado emocional del estudiante antes de reanudar la tarea en el nuevo espacio.",
        correctStep: 4,
      },
      {
        optionKey: "caso-14-d",
        text: "Utilizar un pictograma de anticipación rápida para reestructurar la percepción del entorno físico.",
        correctStep: 2,
      },
    ],
  },
  {
    caseKey: "caso-15",
    title: "Área de Discapacidad Intelectual y Taller Laboral",
    imageKey: "taller",
    baseText: "En un taller laboral de educación diferencial, un alumno presenta dificultades severas para retener los pasos de una tarea de ensamblaje complejo.",
    twistText: "¡Alerta de Cambio! Una de las piezas clave del kit de ensamblaje se agota por completo en el inventario del taller durante la sesión.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "El quiebre de stock desorganiza la memoria de trabajo del alumno. Tu flexibilidad pedagógica te lleva a recordar la secuencia de armado (paso 2), sustituir el componente (paso 4), ajustar el procedimiento técnico (paso 1) y supervisar el estándar final (paso 3).",
    options: [
      {
        optionKey: "caso-15-a",
        text: "Ajustar el procedimiento técnico de ensamblaje a la nueva pieza integradora incorporada.",
        correctStep: 3,
      },
      {
        optionKey: "caso-15-b",
        text: "Recordar la secuencia general de armado fijada en la fase inicial de lectura para mantener el hilo operativo.",
        correctStep: 1,
      },
      {
        optionKey: "caso-15-c",
        text: "Supervisar el estándar de calidad del producto final modificado.",
        correctStep: 4,
      },
      {
        optionKey: "caso-15-d",
        text: "Sustituir la pieza faltante por un componente equivalente disponible en el taller.",
        correctStep: 2,
      },
    ],
  },
  {
    caseKey: "caso-16",
    title: "Área de Co-enseñanza en Aula Común",
    imageKey: "laboratorio",
    baseText: "En una clase co-enseñada de Ciencias en 6.° básico, los docentes discrepan en la aplicación práctica de los principios del Diseño Universal de Aprendizaje (DUA).",
    twistText: "¡Alerta de Cambio! El profesor titular de la asignatura sufre una descompensación médica y debe abandonar el aula, recayendo la co-enseñanza exclusivamente en la educadora diferencial sin previo aviso.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "La salida abrupta del docente titular activa una crisis que bloquea la planificación tradicional. Tu flexibilidad pedagógica te lleva a inhibir el impulso de suspender la clase (paso 3), recuperar los contenidos clave (paso 4), reestructurar a taller guiado (paso 1) e implementar la evaluación (paso 2).",
    options: [
      {
        optionKey: "caso-16-a",
        text: "Reestructurar de inmediato el formato de la sesión hacia un taller guiado de profundización autónoma.",
        correctStep: 3,
      },
      {
        optionKey: "caso-16-b",
        text: "Implementar la pauta de evaluación diversificada prevista para el cierre del bloque.",
        correctStep: 4,
      },
      {
        optionKey: "caso-16-c",
        text: "Inhibir el impulso de suspender la clase ante la ausencia imprevista del par colaborador.",
        correctStep: 1,
      },
      {
        optionKey: "caso-16-d",
        text: "Recuperar de la memoria de trabajo los contenidos centrales introducidos por el docente titular.",
        correctStep: 2,
      },
    ],
  },
  {
    caseKey: "caso-17",
    title: "Área de Dificultades Específicas del Aprendizaje (DEA)",
    imageKey: "cuaderno",
    baseText: "En 5.° básico, un estudiante con DEA confunde grafemas simétricos de forma persistente en una evaluación formal escrita de historia.",
    twistText: "¡Alerta de Cambio! El equipo directivo instruye de forma obligatoria que la prueba escrita sea reemplazada por una defensa oral inmediata debido a un cambio normativo interno.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "El cambio repentino a formato oral altera el sistema de respuesta del alumno. Tu flexibilidad pedagógica te lleva a retener los conceptos clave (paso 2), modificar el instrumento a pauta oral (paso 4), descartar la ortografía por fluidez (paso 1) y aplicar andamiaje verbal (paso 3).",
    options: [
      {
        optionKey: "caso-17-a",
        text: "Descartar el plan original de corrección ortográfica escrita y enfocar la rúbrica en la fluidez argumentativa.",
        correctStep: 3,
      },
      {
        optionKey: "caso-17-b",
        text: "Retener los criterios conceptuales esenciales que el alumno ya había procesado por escrito.",
        correctStep: 1,
      },
      {
        optionKey: "caso-17-c",
        text: "Aplicar preguntas de andamiaje breves para guiar la exposición verbal del estudiante en el momento.",
        correctStep: 4,
      },
      {
        optionKey: "caso-17-d",
        text: "Modificar el instrumento de evaluación hacia una pauta de exposición oral estructurada.",
        correctStep: 2,
      },
    ],
  },
  {
    caseKey: "caso-18",
    title: "Área de Altas Capacidades Intelectuales",
    imageKey: "espacio",
    baseText: "Un alumno con altas capacidades en 7.° básico finaliza las actividades curriculares estándar en pocos minutos y comienza a desestabilizar el clima general del aula.",
    twistText: "¡Alerta de Cambio! El centro de recursos didácticos de la escuela cierra por inventario de emergencia, bloqueando el acceso al material avanzado previsto.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "La falta de material avanzado y la inquietud del alumno tensionan el manejo del grupo. Tu flexibilidad pedagógica te lleva a inhibir la respuesta punitiva (paso 3), recordar sus intereses (paso 4), diseñar un reto de pensamiento lateral in situ (paso 1) y evaluar mediante metacognición (paso 2).",
    options: [
      {
        optionKey: "caso-18-a",
        text: "Diseñar un desafío de pensamiento lateral vinculado a problemas del entorno real del estudiante.",
        correctStep: 3,
      },
      {
        optionKey: "caso-18-b",
        text: "Evaluar el producto cognitivo generado mediante una pauta de metacognición breve.",
        correctStep: 4,
      },
      {
        optionKey: "caso-18-c",
        text: "Inhibir cualquier respuesta punitiva tradicional frente a la inquietud observada en el aula.",
        correctStep: 1,
      },
      {
        optionKey: "caso-18-d",
        text: "Recordar los intereses temáticos previos manifestados por el alumno para personalizar el reto intelectual.",
        correctStep: 2,
      },
    ],
  },
  {
    caseKey: "caso-19",
    title: "Área de Trastorno por Déficit Atencional (TDAH)",
    imageKey: "reloj",
    baseText: "En 3.° básico, un estudiante con TDAH pierde el hilo conductor de una instrucción secuencial compleja entregada para una tarea de ciencias.",
    twistText: "¡Alerta de Cambio! Se inicia de forma sorpresiva una actividad masiva en el patio contiguo, elevando drásticamente el ruido ambiental en el recinto escolar.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "El ruido ambiental dispersa la escasa memoria de trabajo del alumno. Tu flexibilidad pedagógica te lleva a retener la instrucción base (paso 3), fragmentarla en micro-pasos (paso 4), implementar un regulador táctil (paso 2) y redirigir el foco con consignas breves (paso 1).",
    options: [
      {
        optionKey: "caso-19-a",
        text: "Redirigir el foco atencional hacia la tarea mediante consignas directas y de baja extensión.",
        correctStep: 4,
      },
      {
        optionKey: "caso-19-b",
        text: "Implementar un controlador físico de atención (soporte táctil o manipulación de objeto neutro regulador).",
        correctStep: 3,
      },
      {
        optionKey: "caso-19-c",
        text: "Retener la instrucción global original analizada en la fase de lectura base.",
        correctStep: 1,
      },
      {
        optionKey: "caso-19-d",
        text: "Fragmentar la instrucción original retenida en la memoria en micro-pasos de ejecución inmediata.",
        correctStep: 2,
      },
    ],
  },
  {
    caseKey: "caso-20",
    title: "Área de Discapacidad Sensorial (Baja Visión)",
    imageKey: "lupa",
    baseText: "En 6.° básico, una estudiante con baja visión utiliza un macrotipo que presenta errores importantes de transcripción en una guía de matemáticas.",
    twistText: "¡Alerta de Cambio! El software de ampliación de pantalla del notebook institucional sufre un bloqueo total del sistema operativo.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "El colapso tecnológico bloquea el acceso visual y genera frustración. Tu flexibilidad pedagógica te lleva a retener los ejercicios leídos (paso 3), inhibir la frustración activando una lupa física (paso 4), reorganizar la iluminación (paso 1) y continuar con los ítems prioritarios (paso 2).",
    options: [
      {
        optionKey: "caso-20-a",
        text: "Reorganizar la disposición de la iluminación directa en el puesto de trabajo.",
        correctStep: 3,
      },
      {
        optionKey: "caso-20-b",
        text: "Continuar con la resolución de los ítems prioritarios bajo el formato adaptado.",
        correctStep: 4,
      },
      {
        optionKey: "caso-20-c",
        text: "Retener los ejercicios matemáticos que la estudiante alcanzó a leer previo al fallo tecnológico.",
        correctStep: 1,
      },
      {
        optionKey: "caso-20-d",
        text: "Inhibir la frustración técnica y activar un protocolo de apoyo visual analógico alternativo (lupa física especializada).",
        correctStep: 2,
      },
    ],
  },
  {
    caseKey: "caso-21",
    title: "Área de Tránsito a la Educación Superior",
    imageKey: "universidad",
    baseText: "En un módulo universitario de Pedagogía en Educación Diferencial, un estudiante adulto trabajador presenta un retraso crítico en su proyecto de tesis por sobrecarga laboral.",
    twistText: "¡Alerta de Cambio! La jefatura de carrera reduce los plazos de entrega administrativa a la mitad debido a una auditoría curricular externa e imprevista.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "La reducción de plazos administrativos satura la capacidad ejecutiva del estudiante. Tu flexibilidad pedagógica te lleva a retener las matrices teóricas (paso 3), inhibir el rechazo priorizando capítulos críticos (paso 4), rediseñar la metodología a revisión bibliográfica (paso 1) y calendarizar entregas (paso 2).",
    options: [
      {
        optionKey: "caso-21-a",
        text: "Rediseñar la estructura metodológica del proyecto hacia un formato acotado de artículo de revisión bibliográfica.",
        correctStep: 3,
      },
      {
        optionKey: "caso-21-b",
        text: "Establecer un calendario sincrónico de entregas parciales y retroalimentación constante con el comité académico.",
        correctStep: 4,
      },
      {
        optionKey: "caso-21-c",
        text: "Retener las matrices teóricas principales avanzadas en las tutorías y asesorías previas.",
        correctStep: 1,
      },
      {
        optionKey: "caso-21-d",
        text: "Inhibir el rechazo inicial ante la presión temporal priorizando los capítulos críticos de la investigación.",
        correctStep: 2,
      },
    ],
  },
  {
    caseKey: "caso-22",
    title: "Área de Adaptación Curricular Significativa y Diversidad Funcional",
    imageKey: "rampa",
    baseText: "En 8.° básico, se evalúa la pertinencia psicopedagógica de una adecuación curricular significativa para un estudiante con multidiscapacidad intelectual y motora.",
    twistText: "¡Alerta de Cambio! La familia se opone rotundamente en reunión de pauta a cualquier modificación curricular que disminuya el nivel de exigencia formal del curso común.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "La resistencia familiar genera una crisis operativa. Tu flexibilidad pedagógica te lleva a retener los fundamentos técnicos (paso 3), abrir una mesa de mediación basada en DUA (paso 4), consensuar un plan gradual (paso 1) y formalizar los acuerdos en el PACI (paso 2).",
    options: [
      {
        optionKey: "caso-22-a",
        text: "Reestructurar el plan de adecuación hacia un modelo de acceso y progresión gradual consensuado con la familia.",
        correctStep: 3,
      },
      {
        optionKey: "caso-22-b",
        text: "Redactar los acuerdos en el documento de adecuación curricular individual (PACI).",
        correctStep: 4,
      },
      {
        optionKey: "caso-22-c",
        text: "Retener los argumentos técnicos y psicopedagógicos que justifican la diversificación de la enseñanza.",
        correctStep: 1,
      },
      {
        optionKey: "caso-22-d",
        text: "Establecer una mesa de mediación pedagógica basada en evidencias de accesibilidad universal y diseño DUA.",
        correctStep: 2,
      },
    ],
  },
  {
    caseKey: "caso-23",
    title: "Área de Gestión de Convivencia y Diversidad Neurocognitiva",
    imageKey: "circulo",
    baseText: "En un liceo de enseñanza media, se produce un conflicto crítico de convivencia escolar que involucra a estudiantes del PIE y comentarios discriminatorios severos.",
    twistText: "¡Alerta de Cambio! Los apoderados convocan a una toma de la dirección del establecimiento exigiendo la expulsión inmediata de los estudiantes involucrados.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "La presión de los apoderados por una sanción punitiva desestabiliza el clima institucional. Tu flexibilidad pedagógica te lleva a retener los antecedentes diagnósticos (paso 4), inhibir la expulsión mediante justicia restaurativa (paso 3), unir a los equipos de apoyo (paso 2) y convocar a una asamblea inclusiva (paso 1).",
    options: [
      {
        optionKey: "caso-23-a",
        text: "Convocar a una asamblea informativa con los apoderados basada en el respeto a la inclusión educativa.",
        correctStep: 4,
      },
      {
        optionKey: "caso-23-b",
        text: "Reconfigurar la intervención escolar integrando a los equipos de orientación, convivencia y PIE en un frente común.",
        correctStep: 3,
      },
      {
        optionKey: "caso-23-c",
        text: "Inhibir el juicio punitivo institucional y activar un protocolo de justicia restaurativa y talleres de sensibilización neurodiversa.",
        correctStep: 2,
      },
      {
        optionKey: "caso-23-d",
        text: "Retener los antecedentes psicosociales y diagnósticos de los estudiantes implicados en el conflicto.",
        correctStep: 1,
      },
    ],
  },
  {
    caseKey: "caso-24",
    title: "Área de Investigación Educativa y Práctica Basada en Evidencia",
    imageKey: "investigacion",
    baseText: "Durante la ejecución de un proyecto de innovación en el aula universitaria, los datos preliminares del grupo experimental en funciones ejecutivas muestran resultados dispares en modalidad online versus presencial.",
    twistText: "¡Alerta de Cambio! El co-investigador principal renuncia al equipo por motivos de fuerza mayor a mitad del período crítico de intervención.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "La renuncia del co-investigador pone en riesgo la validez del estudio. Tu flexibilidad pedagógica te lleva a retener los parámetros metodológicos (paso 3), reasignar funciones al equipo restante (paso 2), ajustar la temporalidad de las plataformas (paso 4) y validar la consistencia de los instrumentos (paso 1).",
    options: [
      {
        optionKey: "caso-24-a",
        text: "Validar la consistencia de los instrumentos aplicados en ambas modalidades (sincrónica y presencial).",
        correctStep: 4,
      },
      {
        optionKey: "caso-24-b",
        text: "Reasignar las funciones de análisis estadístico y recogida de datos entre los colaboradores restantes del proyecto.",
        correctStep: 2,
      },
      {
        optionKey: "caso-24-c",
        text: "Retener los parámetros metodológicos y criterios de exclusión/inclusión establecidos en el diseño original de la investigación.",
        correctStep: 1,
      },
      {
        optionKey: "caso-24-d",
        text: "Ajustar la temporalidad del procesamiento de datos en las plataformas dinámicas para cumplir con los hitos comprometidos.",
        correctStep: 3,
      },
    ],
  },
  {
    caseKey: "caso-25",
    title: "Área de Trastornos del Neurodesarrollo Complejos y Plan Multidisciplinario",
    imageKey: "taller",
    baseText: "En un establecimiento de educación especial, se diseña un programa de transición a la vida adulta para estudiantes con compromiso cognitivo moderado.",
    twistText: "¡Alerta de Cambio! La institución externa que ofrecía los campos de práctica laboral protegida suspende el convenio de colaboración de forma abrupta.",
    promptText: "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:",
    feedback: "La suspensión del convenio laboral externo genera un bloqueo sistémico. Tu flexibilidad pedagógica te lleva a retener las competencias evaluadas (paso 3), inhibir la parálisis mediante simulación intramuros (paso 4), buscar redes de apoyo locales (paso 2) y actualizar el plan individual (paso 1).",
    options: [
      {
        optionKey: "caso-25-a",
        text: "Actualizar el plan de transición individual con metas ajustadas al nuevo escenario operativo de apresto laboral.",
        correctStep: 4,
      },
      {
        optionKey: "caso-25-b",
        text: "Reestructurar las redes de apoyo comunitaria para buscar micro-emprendimientos o alianzas locales alternativas.",
        correctStep: 3,
      },
      {
        optionKey: "caso-25-c",
        text: "Retener las competencias de autonomía y habilidades adaptativas evaluadas previamente en los estudiantes.",
        correctStep: 1,
      },
      {
        optionKey: "caso-25-d",
        text: "Inhibir la parálisis operativa y rediseñar el componente práctico hacia un entorno de simulación sociolaboral intramuros dentro del centro educativo.",
        correctStep: 2,
      },
    ],
  },
];
