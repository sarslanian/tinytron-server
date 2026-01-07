import xml2js from 'xml2js';
import dotenv from 'dotenv';
import { promisify } from 'util';

dotenv.config(); // Load environment variables
const parser = new xml2js.Parser();

const parseXml = promisify(parser.parseString);

const fetchCTAData = async (mapId, max, rt, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?mapid=${mapId}&max=${max}&rt=${rt}&key=${process.env.CTA_API_KEY}`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.text();
            const result = await parseXml(data);
            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error(`Attempt ${attempt}/${retries}: CTA request timeout`);
            } else {
                console.error(`Attempt ${attempt}/${retries}: Error fetching CTA data:`, error.message);
            }
            
            // If this is the last attempt, return null instead of throwing
            if (attempt === retries) {
                console.error('All retry attempts failed for CTA data');
                return null; // Return null instead of throwing
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    return null;
}

export {fetchCTAData};