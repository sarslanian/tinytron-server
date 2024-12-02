import { fetchCTAData } from "../fetch/cta.js"
import { fetchWeatherData } from "../fetch/weather.js"
import { generateCTA } from "../gennies/cta.js"
import { generateDate } from "../gennies/date.js"
import { generateTime } from "../gennies/time.js"
import { generateHilo, generateCurrent, generateFeels, generateWeatherText } from "../gennies/weather.js"

const dashboard = async () => {

    let payload = []

    const ctaData = await fetchCTAData("40710", "5", "brn");
    const weatherData = await fetchWeatherData("latitude=41.89536&longitude=13.41&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FChicago&forecast_days=1");
    
    const cta = await generateCTA(ctaData, 1, 23, "0x8B4513");
    const date  = await generateDate(1, 4, "0x8a8a8a");
    const time = await generateTime(46, 4, "0x8a8a8a");
    const hiLo = await generateHilo(weatherData.daily, 1, 10, "0x00ffff", "0xE60000", "0xffffff");
    const current = await generateCurrent(weatherData.current, 41, 10, "0x00ffff");
    const feels = await generateFeels(weatherData.current, 49, 10, "0x00ffff");
    const weatherText = await generateWeatherText(weatherData.daily.weather_code[0], 1, 16, "0x00ffff");

    const ctaLine =  {
        "type": "shape",
        "shape": "rect",
        "fill": "0x8B4513",
        "start_x": 0,
        "start_y":18,
        "width": 64,
        "height": 1
    }

    payload.push(cta);
    payload.push(date);
    payload.push(current);
    payload.push(feels);
    payload.push(weatherText);
    payload.push(ctaLine);

    time.forEach((element) => {
        payload.push(element)
    });
    hiLo.forEach((element) => {
        payload.push(element
        );
    });
    

    return payload

}

export {dashboard};