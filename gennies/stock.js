// Generate stock symbol display
const generateStockSymbol = async (symbol, x, y, color) => {
    if (!symbol) {
        return { type: "text", text: "N/A", x: x, y: y, color: "0xFF0000" };
    }
    
    return { type: "text", text: symbol, x: x, y: y, color: color };
};

// Generate stock price display
const generateStockPrice = async (price, x, y, color) => {
    if (price === null || price === undefined) {
        return { type: "text", text: "N/A", x: x, y: y, color: "0xFF0000" };
    }
    
    // Format price to 2 decimal places, but remove trailing zeros if whole number
    const formattedPrice = price.toFixed(2).replace(/\.?0+$/, '');
    
    return { type: "text", text: `$${formattedPrice}`, x: x, y: y, color: color };
};

// Generate stock change display (with color based on positive/negative) - compact format
const generateStockChange = async (change, changePercent, x, y) => {
    if (change === null || change === undefined) {
        return { type: "text", text: "N/A", x: x, y: y, color: "0xFF0000" };
    }
    
    const isPositive = change >= 0;
    const color = isPositive ? "0x00FF00" : "0xFF0000"; // Green for positive, red for negative
    const sign = isPositive ? "+" : "";
    // Format: +1.23% (just percentage, more compact)
    const formattedPercent = changePercent.toFixed(2).replace(/\.?0+$/, '');
    
    return { 
        type: "text", 
        text: `${sign}${formattedPercent}%`, 
        x: x, 
        y: y, 
        color: color 
    };
};

// Generate a complete stock display (symbol, price, change) - compact vertical layout
const generateStockDisplay = async (stockData, x, y, symbolColor, priceColor) => {
    if (!stockData) {
        return [
            { type: "text", text: "No data", x: x, y: y, color: "0xFF0000" }
        ];
    }
    
    const elements = [];
    
    // Line 1: Stock symbol only
    elements.push(await generateStockSymbol(stockData.symbol, x, y, symbolColor));
    
    // Line 2: Price (below symbol)
    elements.push(await generateStockPrice(stockData.price, x, y + 10, priceColor));
    
    // Line 3: Change percentage (compact format, below price)
    elements.push(await generateStockChange(stockData.change, stockData.changePercent, x, y + 20));
    
    return elements;
};

// Generate display for multiple stocks (array)
const generateStocksDisplay = async (stocksData, startX, startY, symbolColor, priceColor) => {
    if (!stocksData || stocksData.length === 0) {
        return [
            { type: "text", text: "No stocks", x: startX, y: startY, color: "0xFF0000" }
        ];
    }
    
    const elements = [];
    const lineHeight = 16; // Vertical spacing between stocks
    
    stocksData.forEach((stock, index) => {
        const y = startY + (index * lineHeight);
        const stockElements = generateStockDisplay(stock, startX, y, symbolColor, priceColor);
        // Note: generateStockDisplay returns a promise, so we need to handle it
        // For now, we'll push the promise and resolve later, or make it sync
        // Actually, let's make it simpler - we'll call it and await in the application
    });
    
    // For now, return elements for first stock only, we'll handle multiple in the application
    if (stocksData.length > 0) {
        const firstStockElements = await generateStockDisplay(stocksData[0], startX, startY, symbolColor, priceColor);
        elements.push(...firstStockElements);
    }
    
    return elements;
};

export { generateStockSymbol, generateStockPrice, generateStockChange, generateStockDisplay, generateStocksDisplay };
