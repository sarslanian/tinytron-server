import { fetchStockData } from "../fetch/stock.js";
import { generateStockDisplay, generateStocksDisplay } from "../gennies/stock.js";

const DEFAULT_STOCKS = ['AAPL'];
const ROTATION_INTERVAL = 5000; // Rotate every 5 seconds

class StocksApplication {
    constructor() {
        this.currentStockIndex = 0;
        this.lastRotationTime = Date.now();
    }

    async getData(symbols = DEFAULT_STOCKS) {
        let payload = [];

        try {
            // Fetch stock data for all symbols
            const stocksData = await fetchStockData(symbols);

            if (!stocksData || stocksData.length === 0) {
                return [{ type: "text", text: "Stock data unavailable", x: 1, y: 10, color: "0xFF0000" }];
            }

            // If multiple stocks, rotate through them
            const now = Date.now();
            if (stocksData.length > 1 && (now - this.lastRotationTime) > ROTATION_INTERVAL) {
                this.currentStockIndex = (this.currentStockIndex + 1) % stocksData.length;
                this.lastRotationTime = now;
            }

            // Display current stock (or first stock if single)
            const currentStock = stocksData[this.currentStockIndex] || stocksData[0];

            // Generate stock display - positioned at top
            const stockElements = await generateStockDisplay(
                currentStock,
                1,
                4,
                "0x00FFFF", // Cyan for symbol
                "0xFFFFFF"  // White for price
            );

            payload.push(...stockElements);

            // Market state indicator
            if (currentStock.marketState) {
                const marketStateColor = currentStock.marketState === 'REGULAR' ? "0x00FF00" : "0xFFFF00";
                const marketStateText = currentStock.marketState === 'REGULAR' ? 'OPEN' : 'CLSD';
                payload.push({ type: "text", text: marketStateText, x: 1, y: 28, color: marketStateColor });
            }

            // Stock counter (if multiple stocks)
            if (stocksData.length > 1) {
                const counterText = `${this.currentStockIndex + 1}/${stocksData.length}`;
                const counterX = Math.max(1, 64 - (counterText.length * 4) - 2);
                payload.push({ type: "text", text: counterText, x: counterX, y: 28, color: "0x8a8a8a" });
            }

        } catch (error) {
            console.error('Error in stocks application:', error);
            payload = [{ type: "text", text: "Error loading stocks", x: 1, y: 10, color: "0xFF0000" }];
        }

        return payload;
    }
}

const stocksApp = new StocksApplication();

const stocks = (symbols = DEFAULT_STOCKS) => stocksApp.getData(symbols);

export { stocks };
