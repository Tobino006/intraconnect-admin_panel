// Format timestampz from Supabase
export function FormatDate(dateString) {
    if (!dateString || dateString == '-') {
        return '-';
    }

    const date = new Date(dateString);

    // check if date is valid
    if (isNaN(date.getTime())) return '-';

    // days
    const daysOfWeek = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];

    // get day of the week
    const dayName = daysOfWeek[date.getDay()];

    // get day, month, year
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    // get hours and minutes
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    // return formatted string
    return `${dayName}, ${day}. ${month}. ${year} o ${hours}:${minutes}`;
}