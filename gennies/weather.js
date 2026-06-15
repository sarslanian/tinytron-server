import codes from "../utils/weather_codes.json" with { type: "json" };

const generateHilo = async (data, x, y, loColor, hiColor, slashColor) => {
    console.log(data);
    if (!data) {
        return { t: 't', v: "Err", x: x, y: y, c: loColor };
    }

    const lo = `${Math.round(data.temperature_2m_min)}`;
    const hi = `${Math.round(data.temperature_2m_max)}`;

    let output = `${lo}/${hi}°`;

    return [{ t: 't', v: lo, x: x, y: y, c: loColor }, { t: 't', v: "/", x: x+8, y: y, c: slashColor }, { t: 't', v: hi, x: x+12, y: y, c: hiColor }];
}

const generateCurrent = async (data, x, y, color) => {
    console.log(data);
    if (!data) {
        return { t: 't', v: "Err", x: x, y: y, c: color };
    }

    const output = `${Math.round(data.temperature_2m)}`;

    return { t: 't', v: output, x: x, y: y, c: color };
}

const generateFeels = async (data, x, y, color) => {
    console.log(data);
    if (!data) {
        return { t: 't', v: "Err", x: x, y: y, c: color };
    }

    const output = `[${Math.round(data.apparent_temperature)}]`;

    return { t: 't', v: output, x: x, y: y, c: color };
}

const generateWeatherText = async (data, x, y, color) => {
    console.log(data);
    if (!data) {
        return { t: 't', v: "Err", x: x, y: y, c: color };
    }

    const code = data;
    console.log("code", code);
    // find the object where code matches
    const weather = codes.find(c => c.code === code);

    const output = weather?.description?.toUpperCase() ?? 'UNKNOWN';

    let xCentered = 0;
    const textLength = output.length * 4 - 1; // 3 pixels per character + 1 pixel gap
    xCentered = Math.floor((64 - textLength) / 2);

    return { t: 't', v: output, x: xCentered, y: y, c: weather?.color ?? color };
}

export {generateHilo, generateCurrent, generateFeels, generateWeatherText};