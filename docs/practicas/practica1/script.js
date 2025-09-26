
        // Obtener los elementos del DOM
        const contactButton = document.getElementById('contactButton');
        const contactInfo = document.getElementById('contactInfo');
        
        // Variable para controlar el estado del contacto (visible/oculto)
        let isContactVisible = false;
        
        // Función para mostrar/ocultar información de contacto
        function toggleContact() {
            if (isContactVisible) {
                // Si está visible, lo ocultamos
                contactInfo.classList.remove('show');
                contactButton.textContent = 'Mostrar contacto';
                isContactVisible = false;
            } else {
                // Si está oculto, lo mostramos
                contactInfo.classList.add('show');
                contactButton.textContent = 'Ocultar contacto';
                isContactVisible = true;
            }
        }
        
        // Asignar la función al evento click del botón
        contactButton.addEventListener('click', toggleContact);
        
        // Mensaje en la consola para confirmar que el script está funcionando
        console.log('¡Tarjeta de presentación interactiva cargada correctamente!');
        
        // Efecto adicional: cambiar el texto del botón al pasar el mouse
        contactButton.addEventListener('mouseenter', function() {
            if (!isContactVisible) {
                this.style.background = 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)';
            }
        });
        
        contactButton.addEventListener('mouseleave', function() {
            this.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        });
    
       