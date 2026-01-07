const fetchWeatherData = async (params, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error(`Attempt ${attempt}/${retries}: Request timeout`);
            } else {
                console.error(`Attempt ${attempt}/${retries}: Error fetching weather data:`, error.message);
            }
            
            // If this is the last attempt, return null instead of throwing
            if (attempt === retries) {
                console.error('All retry attempts failed for weather data');
                return null; // Return null instead of throwing
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    return null;
}

export {fetchWeatherData};