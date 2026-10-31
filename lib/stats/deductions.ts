import type { ChartId } from "./types.js";

/**
 * La «leyenda de deduccion» de cada grafico: que se puede concluir al mirarlo y
 * con que cuidado. Es un texto fijo (igual para cualquier estudiante o grupo),
 * asi no se arriesgan conclusiones automaticas sobre pocos datos. El resumen del
 * grupo no lleva leyenda.
 */
const GROUP: Partial<Record<ChartId, string>> = {
  participation:
    "Una barra alta es un juego que más estudiantes ya comenzaron (o terminaron). Una barra baja no dice por sí sola el motivo: puede ser que no han entrado o que el juego aún no está disponible para ese grupo, como Mini casos, que se desbloquea al avanzar.",
  activity:
    "Los picos son los períodos con más estudiantes jugando y los valles, los de menos. Si el uso se concentra en pocas fechas, la plataforma se usa a ratos; si se reparte parejo, se usa con constancia.",
  abandonment:
    "Más partidas abandonadas en un período significa más partidas dejadas a medias y sin retomar. El gráfico no distingue el motivo: cansancio, dificultad o problemas de conexión.",
  "gen-partidas":
    "Si la mayoría está en «1 partida», la plataforma se probó pero no se volvió a usar. Más estudiantes en «11 o más» indica un uso constante.",
  "gen-outcomes":
    "Compara cuántas partidas se cierran y cuántas se cortan. Muchas fallidas apuntan a niveles que cuestan; muchas abandonadas, a partidas largas o a dificultades para seguir jugando.",
  "gen-when":
    "La barra más alta es el día de la semana en que más partidas comienzan. Sirve para elegir cuándo pedirles que jueguen.",
  "gen-no-play":
    "Quien aparece en la lista no tiene ninguna partida registrada. No significa que no quiera jugar: puede no haber entrado todavía.",
  "gen-inactive":
    "Cada fila es un estudiante que ya jugó pero lleva más días sin entrar que el límite elegido. Mientras más días sin jugar, más tiempo lleva sin volver.",
  "gen-stuck":
    "Cada fila es un estudiante que dejó sin superar el mismo nivel de un juego en varias partidas seguidas, hasta su última partida. Sugiere que ese nivel le cuesta; no prueba que no pueda superarlo, y puede deberse también a que juega poco tiempo o con prisa.",
  "gen-failed":
    "Cada fila es un estudiante con partidas cerradas por agotar los 3 intentos de un nivel. Varias partidas fallidas apuntan a un nivel que le cuesta.",
  "gen-abandoners":
    "Cada fila es un estudiante con partidas sin terminar y sin actividad hace más de 4 horas. Puede retomarlas: no equivale a haber dejado el juego.",
  "gen-locked":
    "Cada fila es un estudiante que aún no desbloquea Mini casos, con lo que le falta. Quienes están más cerca van primero.",
  "cs-max-level":
    "Barras a la derecha son estudiantes que llegan lejos; barras acumuladas a la izquierda, estudiantes que se quedan en los primeros niveles.",
  "cs-pass-rate":
    "Una caída del porcentaje en un nivel marca dónde el juego se vuelve más difícil. Si pocos estudiantes jugaron ese nivel, el porcentaje es poco estable: mira también el total en la tabla.",
  "cs-time":
    "Que el tiempo suba con el nivel es lo esperado, porque cada nivel pide recordar más colores. Un nivel con un tiempo muy superior al de sus vecinos es donde más dudan.",
  "cs-reach":
    "La curva solo baja, porque para llegar a un nivel hay que haber superado los anteriores. Una caída fuerte entre dos niveles marca dónde se queda el grupo.",
  "cs-bands":
    "Cada porción es el porcentaje de estudiantes en un tramo de nivel máximo. Una porción grande en el primer tramo indica que muchos se quedan al comienzo.",
  "cs-tries":
    "Si la mayor parte supera los niveles al primer intento, no necesitan repetir. Más peso en el segundo y tercer intento, o en los niveles no superados, señala niveles que cuestan.",
  "cs-error-type":
    "Más intercambios suele indicar que recuerdan los colores pero se confunden en el orden. Más sustituciones suele indicar que no recordaron algún color.",
  "cs-first-error":
    "Un primer fallo en el comienzo suele indicar que no retuvieron los primeros colores; en la parte final, que perdieron el hilo hacia el cierre de la secuencia.",
  "nc-levels":
    "Cada barra cuenta los estudiantes cuyo nivel más alto superado es ese. Una acumulación en un nivel marca dónde se detiene el grupo; el nivel 0 son quienes aún no superan ninguno.",
  "nc-pass-rate":
    "Una caída del porcentaje en un nivel marca dónde el juego se vuelve más difícil. Si pocos estudiantes jugaron ese nivel, el porcentaje es poco estable: mira también el total en la tabla.",
  "nc-time":
    "Un nivel con un tiempo mayor es uno que costó más resolver. El tiempo tiende a subir con el nivel porque los tableros son más grandes y tienen más pares. Solo cuentan quienes lo superaron al primer intento.",
  "nc-reach":
    "La curva solo baja: cada caída marca un nivel donde parte del grupo se queda. Una caída brusca entre dos niveles señala un salto de dificultad.",
  "nc-tries":
    "Si la mayor parte supera los niveles al primer intento, no necesita repetirlos. Más peso en el segundo y tercer intento, o en los niveles no superados, señala niveles que cuestan o que exigen planificar mejor.",
  "nc-errors":
    "Más errores en un nivel indican que el trazo choca más o que se rehace el tablero con más frecuencia. Si el margen usado se acerca al 100 %, el grupo está cerca de perder el intento en ese nivel.",
  "nc-corrections":
    "Corregir es normal. Muchos Deshacer o retrocesos seguidos pueden indicar que prueban caminos sin anticipar; pocos, que planifican antes de trazar. Mira siempre junto con los errores y el tiempo.",
  "nc-correction-mix":
    "Más peso en Deshacer y retroceder indica ajustes pequeños dentro del mismo plan. Más peso en Rehacer tablero indica que, al ver que algo no funciona, prefieren empezar de cero.",
  "mc-steps":
    "Un caso con pocos pasos correctos, o con pocos estudiantes que lo ordenan completo, es el que más cuesta ordenar.",
  "mc-time":
    "Un caso con un tiempo muy superior al del resto es el que más los hizo dudar.",
  "mc-options":
    "Un paso con un porcentaje alto de ubicación errónea, repetido casi siempre en el mismo lugar, señala una confusión común sobre el orden de esa acción. Con pocas partidas puede ser casualidad: revisa cuántas veces se jugó antes de sacar conclusiones.",
};

/** Lo mismo cuando se mira a un solo estudiante: habla de «el» y no de un grupo. */
const SINGLE: Partial<Record<ChartId, string>> = {
  "cs-time":
    "Que el tiempo suba con el nivel es lo esperado, porque cada nivel pide recordar más colores. Un nivel con un tiempo muy superior al de sus vecinos es donde más dudó.",
  "cs-improvement":
    "Si la línea sube, llegó más lejos en sus partidas más recientes que en las primeras. Si baja o se mantiene, su nivel más alto no ha mejorado.",
  "cs-tries":
    "Si la mayor parte está en el primer intento, supera los niveles sin repetir. Más peso en el segundo y tercer intento, o en los niveles no superados, señala niveles que le cuestan.",
  "cs-error-type":
    "Más intercambios suele indicar que recuerda los colores pero se confunde en el orden. Más sustituciones suele indicar que no recordó algún color.",
  "cs-first-error":
    "Un primer fallo en el comienzo suele indicar que no retuvo los primeros colores; en la parte final, que perdió el hilo hacia el cierre de la secuencia.",
  "nc-time":
    "Un nivel con un tiempo mayor es uno que le costó más resolver. El tiempo tiende a subir con el nivel porque los tableros son más grandes y tienen más pares.",
  "mc-steps":
    "Un caso con pocos pasos correctos es uno que le cuesta ordenar.",
  "mc-time":
    "Un caso con un tiempo muy superior al del resto es uno que lo hizo dudar más.",
  "st-time":
    "Si la línea de la última partida queda por debajo de la primera, resuelve esos niveles más rápido que al comienzo. Si queda por encima o igual, su velocidad no ha mejorado.",
  "st-levels":
    "Si la línea sube, llegó más lejos en sus partidas más recientes que en las primeras. Si baja o se mantiene, su nivel más alto no ha mejorado.",
  "st-restarts":
    "Un nivel con más «empezó de nuevo» es donde más le costó encontrar el camino. «Corrigió con Deshacer» son ajustes pequeños dentro del mismo intento.",
  "ev-count":
    "Muestra cuánto jugó en cada período. Un período en cero es un período sin partidas: los promedios de los otros gráficos quedan sin dato ahí.",
  "ev-level":
    "Si la línea sube de un período a otro, sus partidas llegan cada vez más lejos. Cada punto es el promedio del mejor nivel de las partidas de ese período.",
  "ev-time": "Si la línea baja, resuelve más rápido que antes. Si sube, tarda más que antes.",
  "ev-steps":
    "Si la línea sube, ordena más pasos en su lugar correcto en promedio. El máximo es 4 por caso.",
};

/**
 * Solo en Seriacion: cada nivel pide recordar una secuencia mas larga, asi que un tiempo mayor
 * tambien puede venir de haber llegado mas lejos. En Nodos y Mini casos no se agrega.
 */
export const SERIATION_TIME_CAUTION =
  "Cuidado: al llegar a niveles más altos cada nivel pide más, así que un tiempo mayor también puede venir de haber llegado más lejos.";

/** La leyenda de un grafico; undefined si no lleva (el resumen del grupo). */
export function deductionOf(id: ChartId, single: boolean): string | undefined {
  return (single ? SINGLE[id] : undefined) ?? GROUP[id];
}
