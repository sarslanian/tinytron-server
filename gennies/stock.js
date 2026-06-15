// Generate stock symbol display
const generateStockSymbol = (symbol, x, y, color) => {
    if (!symbol) {
        return { t: 't', v: "N/A", x: x, y: y, c: "0xFF0000" };
    }

    return { t: 't', v: symbol, x: x, y: y, c: color };
};

// Generate stock price display
const generateStockPrice = (price, x, y, color) => {
    if (price === null || price === undefined) {
        return { t: 't', v: "N/A", x: x, y: y, c: "0xFF0000" };
    }

    // Format price to 2 decimal places, but remove trailing zeros if whole number
    const formattedPrice = price.toFixed(2).replace(/\.?0+$/, '');

    return { t: 't', v: `$${formattedPrice}`, x: x, y: y, c: color };
};

// Generate stock change display (with color based on positive/negative) - compact format
const generateStockChange = (change, changePercent, x, y) => {
    if (change === null || change === undefined) {
        return { t: 't', v: "N/A", x: x, y: y, c: "0xFF0000" };
    }

    const isPositive = change >= 0;
    const color = isPositive ? "0x00FF00" : "0xFF0000"; // Green for positive, red for negative
    const sign = isPositive ? "+" : "";
    const formattedPercent = changePercent.toFixed(2).replace(/\.?0+$/, '');

    return { t: 't', v: `${sign}${formattedPercent}%`, x: x, y: y, c: color };
};

// Generate a complete stock display (symbol, price, change) - compact vertical layout
const generateStockDisplay = async (stockData, x, y, symbolColor, priceColor) => {
    if (!stockData) {
        return [
            { t: 't', v: "No data", x: x, y: y, c: "0xFF0000" }
        ];
    }

    const elements = [];

    // Line 1: Stock symbol only
    elements.push(generateStockSymbol(stockData.symbol, x, y, symbolColor));

    // Line 2: Price (below symbol)
    elements.push(generateStockPrice(stockData.price, x, y + 10, priceColor));

    // Line 3: Change percentage (compact format, below price)
    elements.push(generateStockChange(stockData.change, stockData.changePercent, x, y + 20));

    return elements;
};

// Generate display for multiple stocks (array)
const generateStocksDisplay = async (stocksData, startX, startY, symbolColor, priceColor) => {
    if (!stocksData || stocksData.length === 0) {
        return [
            { t: 't', v: "No stocks", x: startX, y: startY, c: "0xFF0000" }
        ];
    }

    const lineHeight = 16; // Vertical spacing between stocks

    const nestedElements = await Promise.all(
        stocksData.map((stock, index) => {
            const y = startY + (index * lineHeight);
            return generateStockDisplay(stock, startX, y, symbolColor, priceColor);
        })
    );

    return nestedElements.flat();
};

export { generateStockSymbol, generateStockPrice, generateStockChange, generateStockDisplay, generateStocksDisplay };
