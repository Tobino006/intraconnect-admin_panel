import { supabase } from "./config/supabase.js";

const form = document.getElementById("login-form");
const errorText = document.getElementById("error");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert("Error signing in!")
        return;
    }

    // successful login
    window.location.href = "dashboard.html"
});