// Elementos del DOM: botones y otros componentes que se utilizarán en la interfaz.
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const retryButton = document.getElementById('retryButton');
const status = document.getElementById('status');
const countdown = document.getElementById('countdown');
const output = document.getElementById('output');
const languageSelect = document.getElementById('languageSelect');
const translationOutput = document.getElementById('translationOutput');
const speakButton = document.getElementById('speakButton');

// Variables globales para el reconocimiento de voz y control de estados.
let recognition;  // Instancia de webkitSpeechRecognition.
let isListening = false;  // Indica si el usuario está en el proceso de grabación.
let isRecognitionActive = false;  // Indica si el reconocimiento de voz está activo.
let retryCount = 0;  // Cuenta el número de reintentos tras errores de red.
const MAX_RETRY = 5;  // Máximo de reintentos antes de mostrar el botón de "retry".
let originalText = '';  // Almacena el texto transcrito antes de la traducción.

// Verifica si el navegador soporta webkitSpeechRecognition (funcionalidad de reconocimiento de voz).
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();  // Inicializa el reconocimiento de voz.
    recognition.continuous = true;  // Permite que la grabación sea continua.
    recognition.interimResults = false;  // Solo resultados finales.
    recognition.lang = 'es-ES';  // Configura el idioma del reconocimiento a español.

    // Evento que se dispara al iniciar el reconocimiento de voz.
    recognition.onstart = function() {
        console.log('Reconocimiento de voz iniciado');
        isRecognitionActive = true;  // Actualiza el estado indicando que el reconocimiento está activo.
        updateStatus(true);  // Actualiza la interfaz para reflejar que la grabación está en progreso.
    };

    // Evento que se dispara al recibir un resultado de voz.
    recognition.onresult = function(event) {
        const transcript = event.results[event.results.length - 1][0].transcript;  // Captura la transcripción más reciente.
        console.log('Transcripción:', transcript);
        originalText = transcript;  // Almacena el texto transcrito.
        translateText();  // Inicia el proceso de traducción.
        retryCount = 0;  // Reinicia el conteo de reintentos.
    };

    // Manejo de errores durante el reconocimiento de voz.
    recognition.onerror = function(event) {
        console.error('Error en el reconocimiento de voz:', event.error);
        if (event.error === 'network') {
            handleNetworkError();  // Si es un error de red, maneja el reintento.
        } else if (isListening) {
            setTimeout(restartRecognition, 1000);  // Si el usuario sigue grabando, intenta reiniciar el reconocimiento.
        }
    };

    // Evento que se dispara cuando el reconocimiento de voz se detiene.
    recognition.onend = function() {
        console.log('Reconocimiento de voz finalizado');
        isRecognitionActive = false;  // Indica que el reconocimiento ha terminado.
        if (isListening && retryCount < MAX_RETRY) {
            setTimeout(restartRecognition, 1000);  // Intenta reiniciar si se permite y no ha alcanzado el máximo de reintentos.
        } else {
            updateStatus(false);  // Actualiza la interfaz para reflejar que la grabación se ha detenido.
        }
    };
} else {
    // Si el navegador no soporta reconocimiento de voz, desactiva el botón de inicio y muestra una alerta.
    startButton.disabled = true;
    alert('Lo siento, tu navegador no soporta el reconocimiento de voz.');
}

// Evento cuando el usuario hace clic en el botón de "Iniciar".
startButton.onclick = function() {
    isListening = true;  // Marca que la grabación ha comenzado.
    retryCount = 0;  // Reinicia el conteo de reintentos.
    if (!isRecognitionActive) {
        startCountdown(3);  // Inicia la cuenta regresiva de 3 segundos antes de empezar a grabar.
    }
};

// Evento cuando el usuario hace clic en el botón de "Detener".
stopButton.onclick = function() {
    isListening = false;  // Marca que la grabación se detiene.
    stopRecognition();  // Llama a la función para detener el reconocimiento de voz.
};

// Evento cuando el usuario hace clic en el botón de "Reintentar".
retryButton.onclick = function() {
    retryCount = 0;  // Reinicia el conteo de reintentos.
    startRecognition();  // Vuelve a iniciar el reconocimiento de voz.
};

// Evento cuando el usuario hace clic en el botón de "Hablar" para escuchar la traducción.
speakButton.onclick = function() {
    speakTranslation();  // Llama a la función para sintetizar la traducción en voz.
};

// Evento cuando el usuario cambia el idioma en el selector de idioma.
languageSelect.onchange = function() {
    if (originalText) {
        translateText();  // Realiza la traducción al nuevo idioma seleccionado si ya hay texto original.
    }
};

// Inicia una cuenta regresiva antes de comenzar a grabar.
function startCountdown(seconds) {
    startRecognition();  // Comienza el reconocimiento antes de que la cuenta regresiva termine.
    countdown.textContent = seconds;  // Muestra los segundos restantes en pantalla.
    const interval = setInterval(() => {
        seconds--;
        countdown.textContent = seconds;  // Actualiza el contador.
        if (seconds <= 0) {
            clearInterval(interval);  // Detiene el intervalo cuando llega a 0.
            countdown.textContent = '';  // Limpia el texto de cuenta regresiva.
        }
    }, 1000);
}

// Inicia el reconocimiento de voz si no está activo.
function startRecognition() {
    if (!isRecognitionActive) {
        try {
            recognition.start();  // Inicia el reconocimiento de voz.
            console.log('Iniciando reconocimiento de voz');
            retryButton.style.display = 'none';  // Oculta el botón de "reintentar" mientras se graba.
        } catch (error) {
            console.error('Error al iniciar el reconocimiento:', error);
            handleNetworkError();  // Maneja cualquier error al intentar iniciar el reconocimiento.
        }
    }
}

// Detiene el reconocimiento de voz.
function stopRecognition() {
    isListening = false;  // Marca que la grabación se ha detenido.
    if (isRecognitionActive) {
        recognition.stop();  // Detiene el reconocimiento de voz.
        console.log('Deteniendo reconocimiento de voz');
    }
}

// Reinicia el reconocimiento si es necesario.
function restartRecognition() {
    if (isListening && !isRecognitionActive) {
        startRecognition();  // Vuelve a intentar iniciar el reconocimiento.
    }
}

// Maneja los errores de red con un sistema de reintentos exponenciales.
function handleNetworkError() {
    retryCount++;  // Incrementa el conteo de reintentos.
    const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);  // Calcula el tiempo de espera exponencial (máx. 30 segundos).
    console.log(`Error de red detectado. Reintento ${retryCount} en ${delay/1000} segundos...`);
    updateStatus(false, `Error de red. Reintentando en ${delay/1000} segundos...`);
    if (retryCount >= MAX_RETRY) {
        console.log('Número máximo de reintentos alcanzado.');
        retryButton.style.display = 'inline-block';  // Muestra el botón de "reintentar" si se alcanzó el máximo.
    } else {
        setTimeout(restartRecognition, delay);  // Vuelve a intentar después del tiempo de espera calculado.
    }
}

// Actualiza la interfaz para mostrar el estado actual del reconocimiento.
function updateStatus(recording, message = null) {
    if (recording) {
        status.textContent = 'Escuchando...';  // Muestra que el sistema está grabando.
        status.className = 'recording';  // Cambia el estilo a modo "grabación".
        startButton.disabled = true;  // Desactiva el botón de "iniciar" mientras se graba.
        stopButton.disabled = false;  // Activa el botón de "detener".
        retryButton.style.display = 'none';  // Oculta el botón de "reintentar".
    } else {
        status.textContent = message || 'Grabación detenida';  // Muestra el mensaje correspondiente (puede incluir un error).
        status.className = message ? 'error' : '';  // Aplica estilos de error si es necesario.
        startButton.disabled = false;  // Reactiva el botón de "iniciar".
        stopButton.disabled = true;  // Desactiva el botón de "detener".
    }
}

// Traduce el texto transcrito al idioma seleccionado.
async function translateText() {
    if (!originalText) return;  // No hace nada si no hay texto original.

    const targetLang = languageSelect.value;  // Obtiene el idioma destino del selector.
    try {
        // Llama a la API de Google Translate para obtener la traducción.
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=${targetLang}&dt=t&q=${encodeURIComponent(originalText)}`);
        const data = await response.json();
        const translation = data[0][0][0];  // Extrae la traducción del resultado.
        translationOutput.value = translation;  // Muestra la traducción en el campo de salida.
        output.innerHTML = `Texto original (Español): ${originalText}<br>`;  // Muestra el texto original en la interfaz.
    } catch (error) {
        console.error('Error en la traducción:', error);
        translationOutput.value = 'Error en la traducción';  // Muestra un mensaje de error en la interfaz.
        output.innerHTML = 'Error en la traducción';  // Actualiza la interfaz con un mensaje de error.
    }
}

// Devuelve el nombre legible del idioma según el código.
function getLanguageName(code) {
    const languages = {
        'en': 'Inglés',
        'fr': 'Francés',
        'de': 'Alemán',
        'it': 'Italiano',
        'pt': 'Portugués'
    };
    return languages[code] || code;  // Si el idioma no está mapeado, devuelve el código.
}

// Sintetiza la traducción en voz utilizando SpeechSynthesis.
function speakTranslation() {
    const text = translationOutput.value;  // Obtiene el texto a hablar.
    const lang = languageSelect.value;  // Obtiene el idioma seleccionado.
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);  // Crea una instancia para la síntesis de voz.
        utterance.lang = lang;  // Configura el idioma para la síntesis.
        speechSynthesis.speak(utterance);  // Inicia la reproducción de la voz sintetizada.
    } else {
        alert('Lo siento, tu navegador no soporta la síntesis de voz.');  // Muestra una alerta si la síntesis de voz no es compatible.
    }
}
