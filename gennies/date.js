import { DateTime } from 'luxon';


const generateDate = async (x, y, color) => {

    const now = DateTime.now();
    const output = now.toFormat('LLLdd').toUpperCase();

    return { type: "text", text: output, x: x, y: y, color: color };
}

export { generateDate };
