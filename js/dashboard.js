import { supabase } from "./config/supabase.js"

const { data: { user } } = await supabase.auth.getUser();

if (!user) {
    window.location.href = "index.html";
}

// check admin role
const { data, error } = await supabase
    .from("admin")
    .select("role")
    .eq("user_id", user.id)
    .single();

if (error || (data.role !== "Company" && data.role !== "Department")) {
    alert("You do not have access!");
    await supabase.auth.signOut();
    window.location.href = "index.html";
}

console.log("User: ", user);
console.log("Admin role: ", data?.role);