import xml2js from 'xml2js';
import dotenv from 'dotenv';
import { promisify } from 'util';

dotenv.config(); // Load environment variables
const parser = new xml2js.Parser();

const parseXml = promisify(parser.parseString);

const fetchCTAData = async (mapId, max, rt) => {
    try {
        const response = await fetch(`https://lapi.transitchicago.com/api/1.0/ttarrivals.aspx?mapid=${mapId}&max=${max}&rt=${rt}&key=${process.env.CTA_API_KEY}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.text();
        const result = await parseXml(data);
        return result;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export {fetchCTAData};