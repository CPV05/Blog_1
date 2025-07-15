const appRoot = document.getElementById('app-root');

function renderPage(path) 
{
    appRoot.innerHTML = ''; // Clean the actual content

    if (path === '/' || path === '/home'){
        appRoot.innerHTML = `<h1>Bienvenido a la página de Inicio</h1>
        <p>Contenido de la Home.</p>
        <a href="/about" class="nav-link">Acerca de Nosotros</a>`;
        document.title = 'Inicio';
    } 
    else if (path === '/about'){
        appRoot.innerHTML = `<h1>Acerca de Nosotros</h1>
        <p>Aquí puedes saber más sobre nosotros.</p>`;
        document.title = 'Sobre nosotros';
    }
    else if (path === '/contact'){
        appRoot.innerHTML = `<h1>Contáctanos</h1>
        <p>Envíanos un mensaje.</p>`;
        document.title = 'Contacto';
    }
    else{
        appRoot.innerHTML = `<h1 class="error center middle">404 - Página no encontrada</h1>
        <p class="error center middle">Esta página no existe</p>
        <a href="/home" class="error center middle">Vuelve al inicio</a>`;
        document.title = 'ERROR 404';
    }
}

function handleNavClick(event) 
{
    const targetLink = event.target.closest('a.nav-link');
    
    if (targetLink) {
        event.preventDefault(); // Prevenir la recarga de la página
        const path = targetLink.getAttribute('href');
        
        // Si la ruta no es la actual, actualiza la URL y renderiza
        if (window.location.pathname !== path) {
            // Actualizar la URL en la barra del navegador
            window.history.pushState({}, '', path); 
            // Renderizar la nueva página
            renderPage(path);
        }
    }
}

// Add the event listener
document.addEventListener('click', handleNavClick);

// Listen the changes in the URL with the rows in the navegator
window.addEventListener('popstate', () => { renderPage(window.location.pathname); });

// Render the page
document.addEventListener('DOMContentLoaded', () => { renderPage(window.location.pathname); });