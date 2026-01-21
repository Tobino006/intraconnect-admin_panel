import { supabase } from "./config/supabase";

const { data, error } = await supabase
    .from("user")
    .select("*");

if (error) {
    console.log(error);
} else {
    console.log(data);
}