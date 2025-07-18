function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');

    if (!registerForm) return;
    const messageDiv = registerForm.querySelector('#message');
    const submitButton = registerForm.querySelector('button[type="submit"]');

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        submitButton.disabled = true;
        messageDiv.textContent = '';
        messageDiv.className = '';

        const formData = new FormData(registerForm);

        try {
            const response = await fetch('/register', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                messageDiv.className = 'message-success';
                messageDiv.textContent = result.message + ' Serás redirigido...';
                
                setTimeout(() => {
                    window.history.pushState({}, '', '/login');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                }, 2000);
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