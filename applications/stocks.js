import { fetchStockData } from "../fetch/stock.js";
import { generateStockDisplay, generateStocksDisplay } from "../gennies/stock.js";

// Default stocks to track (starting with Apple)
const DEFAULT_STOCKS = ['AAPL'];

// Track current stock index for rotation
let currentStockIndex = 0;
let lastRotationTime = Date.now();
const ROTATION_INTERVAL = 5000; // Rotate every 5 seconds

const stocks = async (symbols = DEFAULT_STOCKS) => {
    let payload = [];
    
    try {
        // Fetch stock data for all symbols
        const stocksData = await fetchStockData(symbols);
        
        if (!stocksData || stocksData.length === 0) {
            // Return error message if no data
            payload = [
                { type: "text", text: "Stock data unavailable", x: 1, y: 10, color: "0xFF0000" }
            ];
            return payload;
        }
        
        // If multiple stocks, rotate through them
        const now = Date.now();
        if (stocksData.length > 1 && (now - lastRotationTime) > ROTATION_INTERVAL) {
            currentStockIndex = (currentStockIndex + 1) % stocksData.length;
            lastRotationTime = now;
        }
        
        // Display current stock (or first stock if single)
        const currentStock = stocksData[currentStockIndex] || stocksData[0];
        
        // Generate stock display - positioned at top
        const stockElements = await generateStockDisplay(
            currentStock,
            1,
            4,
            "0x00FFFF", // Cyan for symbol
            "0xFFFFFF" // White for price
        );
        
        payload.push(...stockElements);
        
        // Status line: Market state and stock counter (if multiple stocks) - positioned at bottom
        // Add market state indicator if available
        if (currentStock.marketState) {
            const marketStateColor = currentStock.marketState === 'REGULAR' ? "0x00FF00" : "0xFFFF00";
            const marketStateText = currentStock.marketState === 'REGULAR' ? 'OPEN' : 'CLSD';
            payload.push({
                type: "text",
                text: marketStateText,
                x: 1,
                y: 28,
                color: marketStateColor
            });
        }
        
        // If multiple stocks, show indicator (e.g., "1/3") - right side
        if (stocksData.length > 1) {
            const counterText = `${currentStockIndex + 1}/${stocksData.length}`;
            // Right align: 64px width - (text length * ~4px) - 2px margin
            const counterX = Math.max(1, 64 - (counterText.length * 4) - 2);
            payload.push({
                type: "text",
                text: counterText,
                x: counterX,
                y: 28,
                color: "0x8a8a8a"
            });
        }
        
    } catch (error) {
        console.error('Error in stocks application:', error);
        // Return minimal payload with error message
        try {
            payload = [
                { type: "text", text: "Error loading stocks", x: 1, y: 10, color: "0xFF0000" }
            ];
        } catch (fallbackError) {
            console.error('Error in stocks fallback:', fallbackError);
            payload = [
                { type: "text", text: "Error", x: 1, y: 10, color: "0xFF0000" }
            ];
        }
    }
    
    return payload;
};

export { stocks };
