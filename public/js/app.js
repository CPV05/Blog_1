const appRoot = document.getElementById('app-root');

async function fetchTemplate(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`No se encontró el template en la ruta: ${path}`);
        }
        return await response.text(); //Return the html content
    } catch (error) {
        console.error('Error al cargar el template:', error);
        const response = await fetch('./templates/404.html');
        return await response.text();
    }
}

async function renderPage(path) {
    let templatePath = '';
    
    // Load the template
    if (path === '/' || path === '/home') {
        templatePath = './templates/home.html';
        document.title = 'Inicio';
    }
    else if (path === '/about-us' || path === '/about') {
        templatePath = './templates/about-us.html';
        document.title = 'Sobre nosotros';
    }
    else if (path === '/contact') {
        templatePath = './templates/contact.html';
        document.title = 'Contacto';
    }
    else {
        templatePath = './templates/error-404.html';
        document.title = 'ERROR 404';
    }

    appRoot.innerHTML = await fetchTemplate(templatePath);
}

async function handleNavClick(event) {
    const targetLink = event.target.closest('a');
    
    if (targetLink) {
        event.preventDefault(); // Prevenir la recarga de la página
        const path = targetLink.getAttribute('href');
        
        if (window.location.pathname !== path) {
            window.history.pushState({}, '', path); 
            await renderPage(path); // Esperamos a que la página se renderice
        }
    }
}

// Add the event listener
document.addEventListener('click', handleNavClick);

// Listen the changes in the URL with the rows in the navegator
window.addEventListener('popstate', () => { renderPage(window.location.pathname); });

// Render the page
document.addEventListener('DOMContentLoaded', () => { renderPage(window.location.pathname); });