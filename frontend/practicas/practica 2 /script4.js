// script.js

// Variables para llevar el contador
let victorias = 0;
let derrotas = 0;
let empates = 0;

// Opciones del juego y sus emojis
const opciones = {
    piedra: { emoji: "🪨", nombre: "Piedra" },
    papel: { emoji: "📄", nombre: "Papel" },
    tijera: { emoji: "✂️", nombre: "Tijera" }
};

// Referencias a elementos del DOM
const botones = document.querySelectorAll('.choice-btn');
const mensajeResultado = document.getElementById('mensaje-resultado');
const jugadorChoice = document.getElementById('jugador-choice');
const computadoraChoice = document.getElementById('computadora-choice');
const contadorVictorias = document.getElementById('victorias');
const contadorDerrotas = document.getElementById('derrotas');
const contadorEmpates = document.getElementById('empates');
const botonReiniciar = document.getElementById('reiniciar');

// Función para generar elección aleatoria de la computadora
function generarEleccionComputadora() {
    const opcionesArray = Object.keys(opciones);
    const indiceAleatorio = Math.floor(Math.random() * opcionesArray.length);
    return opcionesArray[indiceAleatorio];
}

// Función para determinar el ganador
function determinarGanador(jugador, computadora) {
    if (jugador === computadora) {
        return 'empate';
    }
    
    if (
        (jugador === 'piedra' && computadora === 'tijera') ||
        (jugador === 'papel' && computadora === 'piedra') ||
        (jugador === 'tijera' && computadora === 'papel')
    ) {
        return 'jugador';
    } else {
        return 'computadora';
    }
}

// Función para mostrar el resultado
function mostrarResultado(eleccionJugador, eleccionComputadora, ganador) {
    // Mostrar las elecciones
    jugadorChoice.textContent = opciones[eleccionJugador].emoji;
    computadoraChoice.textContent = opciones[eleccionComputadora].emoji;
    
    // Mostrar mensaje según el resultado
    let mensaje = '';
    mensajeResultado.className = 'result-message'; // Resetear clases
    
    switch (ganador) {
        case 'jugador':
            mensaje = '¡Ganaste! 🎉';
            mensajeResultado.classList.add('ganaste');
            victorias++;
            break;
        case 'computadora':
            mensaje = '¡Perdiste! 😔';
            mensajeResultado.classList.add('perdiste');
            derrotas++;
            break;
        case 'empate':
            mensaje = '¡Empate! 🤝';
            mensajeResultado.classList.add('empate');
            empates++;
            break;
    }
    
    mensajeResultado.textContent = mensaje;
    
    // Mostrar detalles de la jugada
    setTimeout(() => {
        const detalles = `Tu: ${opciones[eleccionJugador].nombre} vs Computadora: ${opciones[eleccionComputadora].nombre}`;
        const mensajeCompleto = `${mensaje} - ${detalles}`;
        mensajeResultado.textContent = mensajeCompleto;
    }, 1500);
}

// Función para actualizar contadores en la pantalla
function actualizarContadores() {
    contadorVictorias.textContent = victorias;
    contadorDerrotas.textContent = derrotas;
    contadorEmpates.textContent = empates;
}

// Función para reiniciar contadores
function reiniciarContadores() {
    victorias = 0;
    derrotas = 0;
    empates = 0;
    actualizarContadores();
    mensajeResultado.textContent = '¡Elige tu jugada!';
    mensajeResultado.className = 'result-message';
    jugadorChoice.textContent = '?';
    computadoraChoice.textContent = '?';
}

// Función principal del juego
function jugar(eleccionJugador) {
    // Generar elección de la computadora
    const eleccionComputadora = generarEleccionComputadora();
    
    // Determinar ganador
    const ganador = determinarGanador(eleccionJugador, eleccionComputadora);
    
    // Mostrar resultado
    mostrarResultado(eleccionJugador, eleccionComputadora, ganador);
    
    // Actualizar contadores
    actualizarContadores();
}

// Event listeners para los botones de elección
botones.forEach(boton => {
    boton.addEventListener('click', () => {
        const eleccion = boton.id;
        jugar(eleccion);
    });
});

// Event listener para el botón de reiniciar
botonReiniciar.addEventListener('click', reiniciarContadores);

// Inicializar contadores al cargar la página
actualizarContadores();