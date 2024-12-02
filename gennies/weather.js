import codes from "../utils/weather_codes.json" assert { type: "json" };

const generateHilo = async (data, x, y, loColor, hiColor, slashColor) => {
    console.log(data);
    if (!data) {
        return { type: "text", text: "Err", x: x, y: y, color: color };
    }

    const lo = `${Math.round(data.temperature_2m_min)}`;
    const hi = `${Math.round(data.temperature_2m_max)}`;

    let output = `${lo}/${hi}°`;

    return [{ type: "text", text: lo, x: x, y: y, color: loColor }, { type: "text", text: "/", x: x+8, y: y, color: slashColor }, { type: "text", text: hi, x: x+12, y: y, color: hiColor }];
}

const generateCurrent = async (data, x, y, color) => {
    console.log(data);
    if (!data) {
        return { type: "text", text: "Err", x: x, y: y, color: color };
    }

    const output = `${Math.round(data.temperature_2m)}`;

    return { type: "text", text: output, x: x, y: y, color: color };
}

const generateFeels = async (data, x, y, color) => {
    console.log(data);
    if (!data) {
        return { type: "text", text: "Err", x: x, y: y, color: color };
    }

    const output = `[${Math.round(data.apparent_temperature)}]`;

    return { type: "text", text: output, x: x, y: y, color: color };
}

const generateWeatherText = async (data, x, y, color) => {
    console.log(data);
    if (!data) {
        return { type: "text", text: "Err", x: x, y: y, color: color };
    }

    const code = data;
    console.log("code", code);
    // find the object where code matches
    const weather = codes.find(c => c.code === code)
    

    const output = weather.description.toUpperCase() || 'UNKNOWN';

    let xCentered = 0;
    const textLength = output.length * 4 - 1; // 3 pixels per character + 1 pixel gap
    xCentered = Math.floor((64 - textLength) / 2);

    return { type: "text", text: output, x: xCentered, y: y, color: weather.color };
}

export {generateHilo, generateCurrent, generateFeels, generateWeatherText};