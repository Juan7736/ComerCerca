// Configuración inicial y variables globales
class EmprendeTacna {
    constructor() {
        this.map = null;
        this.pickerMap = null;
        this.pickerMarker = null;
        this.businesses = JSON.parse(localStorage.getItem('businesses')) || [];
        this.visitedPlaces = JSON.parse(localStorage.getItem('visitedPlaces')) || [];
        this.markers = [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.selectedImages = [];
        
        this.init();
    }

    init() {
        this.initializeMap();
        this.loadBusinesses();
        this.setupEventListeners();
        this.updateStatistics();
        this.loadFeaturedBusinesses();
        this.setupMobileMenu();
    }

    // Inicialización del mapa
    initializeMap() {
        // Coordenadas centrales de Tacna
        const tacnaCenter = [-18.006567, -70.246274];
        
        this.map = L.map('map').setView(tacnaCenter, 14);

        // Capa base de OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Inicializar mapa para selección de ubicación
        this.initializeLocationPicker();
    }

    initializeLocationPicker() {
        const pickerMap = L.map('picker-map').setView([-18.006567, -70.246274], 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(pickerMap);

        // Marcador arrastrable para selección de ubicación
        this.pickerMarker = L.marker(pickerMap.getCenter(), {draggable: true}).addTo(pickerMap);
        
        this.pickerMarker.on('dragend', (event) => {
            const marker = event.target;
            const position = marker.getLatLng();
            this.updateCoordinatesDisplay(position.lat, position.lng);
            console.log('Ubicación seleccionada:', position);
        });

        this.pickerMap = pickerMap;
    }

    // Actualizar display de coordenadas
    updateCoordinatesDisplay(lat, lng) {
        document.getElementById('lat-display').textContent = lat.toFixed(6);
        document.getElementById('lng-display').textContent = lng.toFixed(6);
    }

    // Geocodificación de dirección
    async geocodeAddress(address) {
        try {
            this.showNotification('Buscando ubicación...', 'info');
            
            // Usar Nominatim (OpenStreetMap) para geocodificación
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Tacna, Perú')}&limit=1`
            );
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                
                // Actualizar mapa de selección
                this.pickerMap.setView([lat, lng], 16);
                this.pickerMarker.setLatLng([lat, lng]);
                this.updateCoordinatesDisplay(lat, lng);
                
                this.showNotification('Ubicación encontrada correctamente', 'success');
                return { lat, lng };
            } else {
                throw new Error('No se pudo encontrar la ubicación');
            }
        } catch (error) {
            console.error('Error en geocodificación:', error);
            this.showNotification('No se pudo encontrar la ubicación. Intenta con una dirección más específica.', 'error');
            return null;
        }
    }

    // Cargar negocios en el mapa
    loadBusinesses() {
        // Limpiar marcadores existentes
        this.clearMarkers();

        // Añadir marcadores para cada negocio
        this.businesses.forEach(business => {
            this.addBusinessToMap(business);
        });
    }

    addBusinessToMap(business) {
        const icon = this.getBusinessIcon(business.type);
        
        const marker = L.marker([business.lat, business.lng], {icon: icon})
            .addTo(this.map)
            .bindPopup(this.createBusinessPopup(business));
        
        marker.businessId = business.id;
        this.markers.push(marker);

        // Evento click en el marcador
        marker.on('click', () => {
            this.showBusinessDetails(business.id);
        });
    }

    getBusinessIcon(type) {
        const iconColors = {
            'restaurante': '#e74c3c',
            'cafe': '#d35400',
            'tienda': '#3498db',
            'artesania': '#27ae60',
            'servicio': '#9b59b6',
            'salud': '#e84393',
            'educacion': '#0984e3',
            'otros': '#636e72'
        };

        return L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div class="marker-pin" style="background-color: ${iconColors[type] || '#636e72'}">
                    <i class="${this.getBusinessIconClass(type)}"></i>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
    }

    getBusinessIconClass(type) {
        const icons = {
            'restaurante': 'fas fa-utensils',
            'cafe': 'fas fa-coffee',
            'tienda': 'fas fa-shopping-bag',
            'artesania': 'fas fa-palette',
            'servicio': 'fas fa-tools',
            'salud': 'fas fa-heartbeat',
            'educacion': 'fas fa-graduation-cap',
            'otros': 'fas fa-store'
        };
        
        return icons[type] || 'fas fa-store';
    }

    createBusinessPopup(business) {
        const imagePreview = business.images && business.images.length > 0 
            ? `<img src="${business.images[0]}" alt="${business.name}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 0.5rem;">`
            : '';

        return `
            <div class="business-popup">
                ${imagePreview}
                <h4>${business.name}</h4>
                <p><strong>${this.getBusinessTypeText(business.type)}</strong></p>
                <p>${business.description.substring(0, 100)}...</p>
                <button onclick="app.showBusinessDetails(${business.id})" class="btn-primary">
                    Ver Detalles
                </button>
            </div>
        `;
    }

    getBusinessTypeText(type) {
        const types = {
            'restaurante': '🍽️ Restaurante',
            'cafe': '☕ Cafetería',
            'tienda': '🛍️ Tienda',
            'artesania': '🎨 Artesanía',
            'servicio': '🔧 Servicios',
            'salud': '💊 Salud',
            'educacion': '📚 Educación',
            'otros': '🔷 Otros'
        };
        return types[type] || type;
    }

    clearMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
    }

    // Mostrar detalles del negocio en modal
    showBusinessDetails(businessId) {
        const business = this.businesses.find(b => b.id === businessId);
        if (!business) return;

        // Actualizar contenido del modal
        document.getElementById('modal-business-name').textContent = business.name;
        document.getElementById('modal-business-type').textContent = this.getBusinessTypeText(business.type);
        document.getElementById('modal-business-description').textContent = business.description;
        document.getElementById('modal-business-address').textContent = business.address;
        document.getElementById('modal-business-phone').textContent = business.phone || 'No disponible';
        document.getElementById('modal-business-hours').textContent = business.hours || 'Horario no especificado';

        // Configurar galería de imágenes
        this.setupImageGallery(business.images || []);

        // Configurar botones de acción
        document.getElementById('mark-visited').onclick = () => this.markAsVisited(businessId);
        document.getElementById('get-directions').onclick = () => this.getDirections(business);

        // Mostrar modal
        this.showModal('business-modal');
    }

    // Configurar galería de imágenes en el modal
    setupImageGallery(images) {
        const galleryContainer = document.getElementById('modal-image-gallery');
        
        if (!images || images.length === 0) {
            galleryContainer.innerHTML = `
                <div class="gallery-main" style="background: #f8f9fa; display: flex; align-items: center; justify-content: center; color: #6c757d;">
                    <i class="fas fa-store" style="font-size: 3rem;"></i>
                </div>
            `;
            return;
        }

        let galleryHTML = `
            <div class="gallery-main">
                <img src="${images[0]}" alt="Imagen principal" id="gallery-main-img">
            </div>
        `;

        if (images.length > 1) {
            galleryHTML += `
                <div class="gallery-thumbs">
                    ${images.map((img, index) => `
                        <div class="gallery-thumb ${index === 0 ? 'active' : ''}" onclick="app.changeGalleryImage(${index})">
                            <img src="${img}" alt="Miniatura ${index + 1}">
                        </div>
                    `).join('')}
                </div>
            `;
        }

        galleryContainer.innerHTML = galleryHTML;
    }

    // Cambiar imagen principal en la galería
    changeGalleryImage(index) {
        const business = this.businesses.find(b => 
            b.id === parseInt(document.getElementById('modal-business-name').dataset.businessId)
        );
        
        if (!business || !business.images) return;

        // Actualizar imagen principal
        document.getElementById('gallery-main-img').src = business.images[index];
        
        // Actualizar miniaturas activas
        document.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.style.display = 'block';

        // Cerrar modal al hacer click en la X
        modal.querySelector('.modal-close').onclick = () => {
            modal.style.display = 'none';
        };

        // Cerrar modal al hacer click fuera
        window.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    // Marcar negocio como visitado
    markAsVisited(businessId) {
        if (!this.visitedPlaces.includes(businessId)) {
            this.visitedPlaces.push(businessId);
            localStorage.setItem('visitedPlaces', JSON.stringify(this.visitedPlaces));
            this.showNotification('¡Negocio marcado como visitado!', 'success');
            this.updateStatistics();
            this.hideModal('business-modal');
        } else {
            this.showNotification('Ya has visitado este negocio.', 'warning');
        }
    }

    // Obtener direcciones
    getDirections(business) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${business.lat},${business.lng}`;
        window.open(url, '_blank');
    }

    // Gestión del formulario de negocio
    setupEventListeners() {
        // Formulario de negocio
        document.getElementById('business-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleBusinessSubmit();
        });

        // Botón de geocodificación
        document.getElementById('geocode-address').addEventListener('click', () => {
            this.handleGeocodeAddress();
        });

        // Input de imágenes
        document.getElementById('business-images').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files);
        });

        // Filtro de categorías
        document.getElementById('business-filter').addEventListener('change', (e) => {
            this.filterBusinessesByCategory(e.target.value);
        });

        // Botón de ubicación
        document.getElementById('locate-me').addEventListener('click', () => {
            this.locateUser();
        });

        // Menú de usuario
        this.setupUserMenu();
        
        // Scroll suave para enlaces internos
        this.setupSmoothScroll();
    }

    // Manejar subida de imágenes
    handleImageUpload(files) {
        const previewContainer = document.getElementById('image-preview');
        const maxImages = 5;
        
        // Limitar a 5 imágenes
        if (this.selectedImages.length + files.length > maxImages) {
            this.showNotification(`Máximo ${maxImages} imágenes permitidas`, 'warning');
            return;
        }

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                this.showNotification('Solo se permiten archivos de imagen', 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                this.selectedImages.push(imageData);
                this.updateImagePreview();
            };
            reader.readAsDataURL(file);
        });
    }

    // Actualizar vista previa de imágenes
    updateImagePreview() {
        const previewContainer = document.getElementById('image-preview');
        previewContainer.innerHTML = '';

        this.selectedImages.forEach((imageData, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${imageData}" alt="Vista previa ${index + 1}">
                <button type="button" onclick="app.removeImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewContainer.appendChild(previewItem);
        });
    }

    // Eliminar imagen de la selección
    removeImage(index) {
        this.selectedImages.splice(index, 1);
        this.updateImagePreview();
    }

    // Manejar geocodificación de dirección
    async handleGeocodeAddress() {
        const address = document.getElementById('business-address').value.trim();
        
        if (!address) {
            this.showNotification('Por favor ingresa una dirección primero', 'error');
            return;
        }

        const result = await this.geocodeAddress(address);
        if (result) {
            document.getElementById('location-status').textContent = 'Ubicación encontrada. Puedes ajustar arrastrando el marcador.';
            document.getElementById('location-status').style.color = '#27ae60';
        }
    }

    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const navMenu = document.querySelector('.nav-menu');
        
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileMenuBtn.innerHTML = navMenu.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });
        
        // Cerrar menú al hacer clic en un enlace
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });
    }

    handleBusinessSubmit() {
        const lat = parseFloat(document.getElementById('lat-display').textContent);
        const lng = parseFloat(document.getElementById('lng-display').textContent);

        const formData = {
            id: Date.now(),
            name: document.getElementById('business-name').value.trim(),
            type: document.getElementById('business-type').value,
            description: document.getElementById('business-description').value.trim(),
            address: document.getElementById('business-address').value.trim(),
            phone: document.getElementById('business-phone').value.trim(),
            hours: document.getElementById('business-hours').value.trim(),
            lat: lat,
            lng: lng,
            images: [...this.selectedImages],
            createdAt: new Date().toISOString(),
            visits: 0,
            rating: 0
        };

        // Validaciones básicas
        if (!this.validateBusinessForm(formData)) {
            return;
        }

        this.businesses.push(formData);
        localStorage.setItem('businesses', JSON.stringify(this.businesses));
        
        this.addBusinessToMap(formData);
        this.updateStatistics();
        this.loadFeaturedBusinesses();
        
        // Limpiar formulario
        document.getElementById('business-form').reset();
        this.selectedImages = [];
        document.getElementById('image-preview').innerHTML = '';
        this.updateCoordinatesDisplay(-18.006567, -70.246274);
        
        this.showNotification('¡Negocio registrado exitosamente!', 'success');
        
        // Desplazarse a la sección de negocios destacados
        setTimeout(() => {
            document.getElementById('negocios-destacados').scrollIntoView({
                behavior: 'smooth'
            });
        }, 500);
    }

    validateBusinessForm(data) {
        if (!data.name || data.name.length < 3) {
            this.showNotification('El nombre del negocio debe tener al menos 3 caracteres.', 'error');
            return false;
        }

        if (!data.type) {
            this.showNotification('Por favor selecciona una categoría para tu negocio.', 'error');
            return false;
        }

        if (!data.description || data.description.length < 10) {
            this.showNotification('La descripción debe tener al menos 10 caracteres.', 'error');
            return false;
        }

        if (!data.address) {
            this.showNotification('Por favor ingresa la dirección de tu negocio.', 'error');
            return false;
        }

        // Validar que las coordenadas no sean las predeterminadas
        if (data.lat === -18.006567 && data.lng === -70.246274) {
            this.showNotification('Por favor obtén la ubicación exacta usando el botón "Obtener Ubicación Exacta".', 'error');
            return false;
        }

        return true;
    }

    // Filtrar negocios por categoría
    filterBusinessesByCategory(category) {
        this.clearMarkers();
        
        if (category === 'all') {
            this.loadBusinesses();
        } else {
            const filteredBusinesses = this.businesses.filter(business => business.type === category);
            filteredBusinesses.forEach(business => this.addBusinessToMap(business));
        }
    }

    // Geolocalización del usuario
    locateUser() {
        if (!navigator.geolocation) {
            this.showNotification('La geolocalización no es soportada por tu navegador.', 'error');
            return;
        }

        this.showNotification('Obteniendo tu ubicación...', 'info');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                // Centrar mapa en la ubicación del usuario
                this.map.setView([userLat, userLng], 15);
                
                // Añadir marcador de ubicación del usuario
                L.marker([userLat, userLng], {
                    icon: L.divIcon({
                        className: 'user-location-marker',
                        html: '<div class="user-location-pin"><i class="fas fa-user"></i></div>',
                        iconSize: [40, 40],
                        iconAnchor: [20, 40]
                    })
                })
                .addTo(this.map)
                .bindPopup('¡Tu ubicación actual!')
                .openPopup();
                
                this.showNotification('Ubicación encontrada correctamente.', 'success');
            },
            (error) => {
                let errorMessage = 'Error al obtener la ubicación.';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Permiso de ubicación denegado.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Información de ubicación no disponible.';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Tiempo de espera agotado.';
                        break;
                }
                
                this.showNotification(errorMessage, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    // Menú de usuario
    setupUserMenu() {
        document.getElementById('profile-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showUserProfile();
        });

        document.getElementById('visited-places-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showVisitedPlaces();
        });

        document.getElementById('my-businesses-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showMyBusinesses();
        });

        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
    }

    showUserProfile() {
        this.showNotification('Funcionalidad de perfil en desarrollo.', 'info');
    }

    showVisitedPlaces() {
        const visitedBusinesses = this.businesses.filter(business => 
            this.visitedPlaces.includes(business.id)
        );

        if (visitedBusinesses.length === 0) {
            this.showNotification('Aún no has visitado ningún negocio.', 'info');
            return;
        }

        let message = 'Lugares que has visitado:\n\n';
        visitedBusinesses.forEach(business => {
            message += `• ${business.name} (${this.getBusinessTypeText(business.type)})\n`;
        });

        alert(message);
    }

    showMyBusinesses() {
        // Mostrar negocios del usuario actual (simulado)
        if (this.currentUser) {
            const userBusinesses = this.businesses.filter(business => 
                business.owner === this.currentUser.id
            );
            
            if (userBusinesses.length === 0) {
                this.showNotification('No tienes negocios registrados.', 'info');
                return;
            }
            
            let message = 'Tus negocios registrados:\n\n';
            userBusinesses.forEach(business => {
                message += `• ${business.name} (${this.getBusinessTypeText(business.type)})\n`;
            });
            
            alert(message);
        } else {
            this.showNotification('Debes iniciar sesión para ver tus negocios.', 'warning');
        }
    }

    logout() {
        this.showNotification('Cerrando sesión...', 'info');
        // Aquí se implementaría la lógica de cierre de sesión
    }

    // Actualizar estadísticas
    updateStatistics() {
        document.getElementById('businesses-count').textContent = this.businesses.length;
        document.getElementById('visits-count').textContent = this.visitedPlaces.length;
        
        // Contar negocios destacados (simulado: los primeros 6 por visitas)
        const featuredCount = Math.min(this.businesses.length, 6);
        document.getElementById('featured-count').textContent = featuredCount;
        
        // Animación de contadores
        this.animateCounter('businesses-count', this.businesses.length);
        this.animateCounter('visits-count', this.visitedPlaces.length);
        this.animateCounter('featured-count', featuredCount);
    }

    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        const currentValue = parseInt(element.textContent);
        
        if (currentValue === targetValue) return;
        
        const increment = targetValue > currentValue ? 1 : -1;
        let current = currentValue;
        
        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            
            if (current === targetValue) {
                clearInterval(timer);
            }
        }, 30);
    }

    // Cargar negocios destacados
    loadFeaturedBusinesses() {
        const featuredContainer = document.getElementById('featured-businesses');
        
        // Ordenar negocios por número de visitas (simulado)
        const featured = this.businesses
            .sort((a, b) => (b.visits || 0) - (a.visits || 0))
            .slice(0, 6);

        if (featured.length === 0) {
            featuredContainer.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                    <i class="fas fa-store-slash" style="font-size: 3rem; color: #bdc3c7; margin-bottom: 1rem;"></i>
                    <h3 style="color: #7f8c8d; margin-bottom: 1rem;">No hay negocios registrados todavía</h3>
                    <p style="color: #95a5a6;">¡Sé el primero en agregar un negocio a la plataforma!</p>
                    <a href="#agregar-negocio" class="btn-primary" style="margin-top: 1.5rem;">
                        <i class="fas fa-plus-circle"></i>
                        Agregar Primer Negocio
                    </a>
                </div>
            `;
            return;
        }

        featuredContainer.innerHTML = featured.map(business => {
            const imagePreview = business.images && business.images.length > 0 
                ? `<img src="${business.images[0]}" alt="${business.name}" style="width: 100%; height: 200px; object-fit: cover;">`
                : `<div style="width: 100%; height: 200px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; color: #6c757d;">
                      <i class="fas fa-store" style="font-size: 2rem;"></i>
                   </div>`;

            return `
                <div class="business-card">
                    ${imagePreview}
                    <div class="business-card-header">
                        <h4>${business.name}</h4>
                        <span class="business-type">${this.getBusinessTypeText(business.type)}</span>
                    </div>
                    <div class="business-card-body">
                        <p>${business.description.substring(0, 120)}...</p>
                        <div class="business-info">
                            <span><i class="fas fa-map-marker-alt"></i> ${business.address}</span>
                            ${business.hours ? `<span><i class="fas fa-clock"></i> ${business.hours}</span>` : ''}
                            ${business.phone ? `<span><i class="fas fa-phone"></i> ${business.phone}</span>` : ''}
                        </div>
                    </div>
                    <div class="business-card-actions">
                        <button onclick="app.showBusinessDetails(${business.id})" class="btn-outline">
                            <i class="fas fa-info-circle"></i>
                            Ver Detalles
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Utilidades
    showNotification(message, type = 'info') {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Añadir estilos
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-lg);
            z-index: 3000;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationColor(type) {
        const colors = {
            'success': '#27ae60',
            'error': '#e74c3c',
            'warning': '#f39c12',
            'info': '#3498db'
        };
        return colors[type] || '#3498db';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
}

// Estilos CSS adicionales para notificaciones y marcadores
const additionalStyles = `
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.notification-content {
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.notification-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
    transition: opacity 0.2s;
}

.notification-close:hover {
    opacity: 1;
}

.marker-pin {
    width: 40px;
    height: 40px;
    border-radius: 50% 50% 50% 0;
    background: var(--primary-color);
    position: absolute;
    transform: rotate(-45deg);
    left: 50%;
    top: 50%;
    margin: -20px 0 0 -20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
}

.marker-pin::after {
    content: '';
    width: 30px;
    height: 30px;
    margin: 5px 0 0 5px;
    background: #fff;
    position: absolute;
    border-radius: 50%;
    z-index: -1;
}

.marker-pin i {
    transform: rotate(45deg);
}

.user-location-pin {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #3498db;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% {
        box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7);
    }
    70% {
        box-shadow: 0 0 0 10px rgba(52, 152, 219, 0);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(52, 152, 219, 0);
    }
}

.business-popup {
    min-width: 250px;
}

.business-popup h4 {
    margin: 0 0 0.5rem 0;
    color: var(--secondary-color);
}

.business-popup p {
    margin: 0.5rem 0;
    color: var(--text-light);
}

.business-popup button {
    width: 100%;
    margin-top: 0.5rem;
}
`;

// Añadir estilos al documento
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EmprendeTacna();
});

// Manejar errores globales
window.addEventListener('error', (event) => {
    console.error('Error en la aplicación:', event.error);
});
