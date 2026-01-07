import { DateTime } from 'luxon';


const generateDate = async (x, y, color) => {
    // Get current time in Chicago timezone
    const chicagoTime = DateTime.now().setZone('America/Chicago');
    
    // Log for debugging
    console.log('Chicago time:', chicagoTime.toString());
    console.log('Chicago date:', chicagoTime.toFormat('LLL dd, yyyy'));
    console.log('Day of month:', chicagoTime.day);
    
    // Format as "MONDD" (e.g., "JAN04")
    const month = chicagoTime.toFormat('LLL').toUpperCase();
    const day = chicagoTime.toFormat('dd');
    const output = `${month}${day}`;
    
    console.log('Formatted output:', output);
    console.log('UTC for comparison:', DateTime.now().toUTC().toFormat('LLL dd, yyyy'));

    return { type: "text", text: output, x: x, y: y, color: color };
}

export { generateDate };
