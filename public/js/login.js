function initLoginForm() {
    const loginForm = document.getElementById('loginForm');

    if (!loginForm) return;
    const messageDiv = loginForm.querySelector('#message');
    const submitButton = loginForm.querySelector('button[type="submit"]');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        submitButton.disabled = true;
        messageDiv.textContent = '';
        messageDiv.className = '';

        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                messageDiv.className = 'message-success';
                messageDiv.textContent = result.message + ' ¡Bienvenido!';
                setTimeout(() => {
                    window.history.pushState({}, '', '/home');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }, 1500);
            }
            else {
                messageDiv.className = 'message-error';
                messageDiv.textContent = result.message;
                submitButton.disabled = false;
            }
        }
        catch (error) {
            console.error('Error de fetch:', error);
            messageDiv.className = 'message-error';
            messageDiv.textContent = 'Error de conexión. Inténtalo de nuevo.';
            submitButton.disabled = false;
        }
    });
}