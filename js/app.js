import { supabase } from './config/supabase.js';

const form = document.getElementById('login-form');

// if user is already logged in, don't show login page
async function checkExistingSession() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        window.location.replace('dashboard.html');
    }
}

// login handler
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert('Nesprávne prihlasovacie údaje.');
        return;
    }

    window.location.replace('dashboard.html');
}

// init
checkExistingSession();
form.addEventListener('submit', handleLogin);