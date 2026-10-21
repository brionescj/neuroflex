type SeedOption = { optionKey: string; text: string; correctStep: 1 | 2 | 3 | 4 };
type SeedCase = {
  caseKey: string;
  title: string;
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
 * Generado a partir del banco que vivia en
 * src/features/games/mini-cases/data/miniCases.data.ts (commit previo a
 * esta migracion). No editar el texto aqui sin editarlo tambien ahi hasta
 * que ese archivo estatico se elimine del todo.
 */
export const MINI_CASES_SEED: SeedCase[] = [
  {
    caseKey: "caso-1",
    title: "Mini Caso 1",
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
    title: "Mini Caso 2",
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
    title: "Mini Caso 3",
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
    title: "Mini Caso 4",
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
    title: "Mini Caso 5",
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
    title: "Mini Caso 6",
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
    title: "Mini Caso 7",
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
    title: "Mini Caso 8",
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
    title: "Mini Caso 9",
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
    title: "Mini Caso 10",
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
];

async function seed(adminSessionCookie: string) {
  for (const miniCase of MINI_CASES_SEED) {
    const response = await fetch(
      "http://localhost:3000/api/admin/mini-cases",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminSessionCookie,
        },
        body: JSON.stringify(miniCase),
      },
    );

    const result = (await response.json()) as {
      success: boolean;
      message: string;
    };

    console.log(miniCase.caseKey, result.success ? "OK" : result.message);
  }
}

const cookie = process.argv[2];

if (!cookie) {
  console.error(
    'Falta la cookie de sesion. Uso: npx tsx server-scripts/seedMiniCases.ts "neuroflex_session=..."',
  );
  process.exit(1);
}

seed(cookie);
