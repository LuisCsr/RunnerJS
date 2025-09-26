
(() => {
  // Utilidades para selección
  const $ = (sel, el = document) => el.querySelector(sel);

  // Año dinámico en el footer
  $('#year').textContent = new Date().getFullYear();

  // ----- Menú móvil
  const navToggle = $('.nav-toggle');
  const primaryNav = $('#primary-nav');
  navToggle?.addEventListener('click', () => {
    const open = primaryNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  // ----- Validación del formulario
  const form = $('#contactForm');
  const nombre = $('#nombre');
  const email = $('#email');
  const mensaje = $('#mensaje');

  const nombreError = $('#nombreError');
  const emailError = $('#emailError');
  const mensajeError = $('#mensajeError');

  // RegEx simple para email — suficiente para validar formato estándar
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  function setError(input, errorEl, message = '') {
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      errorEl.textContent = message;
    } else {
      input.setAttribute('aria-invalid', 'false');
      errorEl.textContent = '';
    }
  }

  function validateNombre() {
    const value = nombre.value.trim();
    if (!value) return setError(nombre, nombreError, 'El nombre es obligatorio.');
    if (value.length < 2) return setError(nombre, nombreError, 'Mínimo 2 caracteres.');
    return setError(nombre, nombreError);
  }

  function validateEmail() {
    const value = email.value.trim();
    if (!value) return setError(email, emailError, 'El email es obligatorio.');
    if (!emailRegex.test(value)) return setError(email, emailError, 'Ingresa un email válido (ej: nombre@dominio.com).');
    return setError(email, emailError);
  }

  function validateMensaje() {
    const value = mensaje.value.trim();
    if (!value) return setError(mensaje, mensajeError, 'Escribe un mensaje.');
    if (value.length < 10) return setError(mensaje, mensajeError, 'Cuéntanos un poco más (mínimo 10 caracteres).');
    return setError(mensaje, mensajeError);
  }

  // Validación en tiempo real
  nombre.addEventListener('input', validateNombre);
  email.addEventListener('input', validateEmail);
  mensaje.addEventListener('input', validateMensaje);

  // ----- Modal de éxito
  const overlay = $('#modalOverlay');
  const modal = $('#successModal');
  const closeModalBtn = $('#closeModal');

  function openModal() {
    overlay.hidden = false;
    modal.hidden = false;
    // Atributo aria-hidden para controlar transiciones CSS
    overlay.setAttribute('aria-hidden', 'false');
    modal.setAttribute('aria-hidden', 'false');

    // Enfocar botón de cerrar (accesibilidad)
    setTimeout(() => closeModalBtn.focus(), 50);
    // Lanzar confeti extra al abrir el modal
    launchConfetti(14);
  }

  function closeModal() {
    overlay.setAttribute('aria-hidden', 'true');
    modal.setAttribute('aria-hidden', 'true');
    // Esperar fin de transición antes de ocultar (evita salto visual)
    setTimeout(() => {
      overlay.hidden = true;
      modal.hidden = true;
    }, 250);
  }

  closeModalBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      closeModal();
    }
  });

  // Trampa de foco básica dentro del modal
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = modal.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // ----- Envío del formulario
  form.addEventListener('submit', (e) => {
    e.preventDefault(); // Evitamos envío real
    // Ejecutar todas las validaciones
    validateNombre();
    validateEmail();
    validateMensaje();

    const invalid = form.querySelector('[aria-invalid="true"]');
    if (invalid) {
      // Si hay errores, animación sutil de "shake" en el campo
      invalid.classList.add('shake');
      setTimeout(() => invalid.classList.remove('shake'), 300);
      return;
    }

    // "Simulamos" envío correcto: mostramos modal + confeti
    openModal();
    form.reset();
    // Reset visual de errores
    setError(nombre, nombreError);
    setError(email, emailError);
    setError(mensaje, mensajeError);
  });

  // ----- Botón "Suscríbete": confeti instantáneo + scroll suave
  const cta = $('#ctaSubscribe');
  cta?.addEventListener('click', (e) => {
    // Lanza confeti incluso si el navegador bloquea el scroll por hash
    launchConfetti(12);
    // Scroll suave accesible
    if (location.hash !== '#contacto') {
      e.preventDefault();
      document.querySelector('#contacto').scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Actualiza hash manualmente
      history.pushState(null, '', '#contacto');
    }
  });

  // ----- Confeti
  // Crea 10–15 divs de confeti con variaciones de color, tamaño y dirección
  function launchConfetti(count = 12) {
    const root = document.getElementById('confetti-root');
    const n = Math.max(10, Math.min(24, count)); // límites sanos
    for (let i = 0; i < n; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti';
      // Forma aleatoria
      const shapes = ['', 'circle', 'diamond'];
      piece.classList.add(shapes[Math.floor(Math.random() * shapes.length)]);

      // Variables CSS personalizadas (tamaño, posición, duración, color, desplazamiento X)
      const hue = Math.floor(Math.random() * 360);
      const x = Math.random() * 100; // porcentaje de pantalla
      const w = 8 + Math.random() * 10;   // ancho 8-18px
      const h = 8 + Math.random() * 16;   // alto 8-24px
      const dur = 2.2 + Math.random() * 1.6;
      const dx = (-80 + Math.random() * 160) + 'px'; // deriva horizontal

      piece.style.setProperty('--hue', hue);
      piece.style.setProperty('--x', x + '%');
      piece.style.setProperty('--w', w + 'px');
      piece.style.setProperty('--h', h + 'px');
      piece.style.setProperty('--dur', dur + 's');
      piece.style.setProperty('--dx', dx);

      root.appendChild(piece);
      // Limpiar al terminar
      piece.addEventListener('animationend', () => piece.remove());
    }
  }

})();
