// Encuestas de opinión del canal de Telegram (sin respuesta correcta): sirven para que la gente vote y comente.
// Las publica api/telegram.js con tipo=encuesta, en orden; al acabarse la lista no se repite ninguna.
// Límites de Telegram: pregunta ≤ 300 caracteres, de 2 a 10 opciones, cada una ≤ 100.
module.exports = [
  { q: '¿Cuánto tiempo llevas jugando al póker?', opts: ['Estoy empezando', 'Menos de 1 año', 'De 1 a 3 años', 'Más de 3 años'] },
  { q: '¿Qué prefieres jugar?', opts: ['Cash', 'Torneos', 'Los dos', 'Solo por diversión'] },
  { q: '¿Qué fallo te cuesta más fichas?', opts: ['Pagar demasiado', 'Tirar manos buenas', 'Farolear de más', 'Jugar demasiadas manos'] },
  { q: '¿En qué posición te sientes más cómodo?', opts: ['Botón', 'Ciegas', 'Posiciones tempranas', 'Me da igual'] },
  { q: '¿Cómo estudias póker?', opts: ['Vídeos', 'Calculadoras y herramientas', 'Libros', 'Jugando y aprendiendo'] },
  { q: '¿Qué te gustaría aprender primero?', opts: ['Pot odds y outs', 'Rangos preflop', 'Farol y semifarol', 'Gestión de la banca'] },
  { q: '¿Haces limp alguna vez?', opts: ['Nunca', 'A veces', 'Casi siempre', '¿Qué es un limp?'] },
  { q: '¿Cuántas horas juegas a la semana?', opts: ['Menos de 2', 'De 2 a 5', 'De 5 a 10', 'Más de 10'] },
  { q: '¿Dónde prefieres jugar?', opts: ['Online', 'En vivo', 'Con amigos', 'Donde haya partida'] },
  { q: '¿Revisas tus manos después de jugar?', opts: ['Siempre', 'A veces', 'Casi nunca', 'Nunca'] },
  { q: '¿Qué te frustra más en la mesa?', opts: ['Los bad beats', 'Rivales que nunca se retiran', 'Mi propio tilt', 'Las ciegas subiendo en torneo'] },
  { q: '¿Qué dato te gustaría que te calculara una herramienta?', opts: ['Mi probabilidad de ganar', 'Si me compensa pagar', 'Qué manos puede tener el rival', 'Todo lo anterior'] },
];
