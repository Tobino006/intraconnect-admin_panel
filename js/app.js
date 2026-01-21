import { supabase } from "./config/supabase.js";

const { data, error } = await supabase
    .from("user")
    .select("*");

if (error) {
    console.log(error);
} else {
    console.log(data);
}