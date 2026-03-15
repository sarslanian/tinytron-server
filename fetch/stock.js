const fetchStockData = async (symbols, retries = 3) => {
    // Ensure symbols is an array
    const symbolArray = Array.isArray(symbols) ? symbols : [symbols];
    
    try {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                // Fetch data for all symbols in parallel
                const fetchPromises = symbolArray.map(async (symbol) => {
                    const response = await fetch(
                        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}`,
                        {
                            signal: controller.signal,
                            headers: {
                                'Connection': 'keep-alive'
                            }
                        }
                    );
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status} for ${symbol}`);
                    }
                    
                    const data = await response.json();
                    
                    // Extract relevant data from Yahoo Finance response
                    if (data.chart && data.chart.result && data.chart.result.length > 0) {
                        const result = data.chart.result[0];
                        const meta = result.meta;
                        const quote = result.indicators?.quote?.[0];
                        
                        if (meta && quote) {
                            const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
                            const previousClose = meta.previousClose || currentPrice;
                            const change = currentPrice - previousClose;
                            const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;
                            
                            return {
                                symbol: symbol.toUpperCase(),
                                price: currentPrice,
                                change: change,
                                changePercent: changePercent,
                                previousClose: previousClose,
                                marketState: meta.marketState || 'UNKNOWN'
                            };
                        }
                    }
                    
                    return null;
                });
                
                const results = await Promise.all(fetchPromises);
                clearTimeout(timeoutId);
                
                // Filter out null results (failed fetches)
                const validResults = results.filter(result => result !== null);
                
                if (validResults.length > 0) {
                    return validResults;
                } else {
                    throw new Error('No valid stock data received');
                }
            } catch (error) {
                // Handle different types of errors
                if (error.name === 'AbortError') {
                    console.error(`Attempt ${attempt}/${retries}: Stock request timeout`);
                } else if (error.cause && error.cause.code === 'UND_ERR_CONNECT_TIMEOUT') {
                    console.error(`Attempt ${attempt}/${retries}: Connection timeout - unable to connect to stock API`);
                } else if (error.message && error.message.includes('fetch failed')) {
                    console.error(`Attempt ${attempt}/${retries}: Network error - ${error.cause?.code || error.message}`);
                } else {
                    console.error(`Attempt ${attempt}/${retries}: Error fetching stock data:`, error.message || error);
                }
                
                // If this is the last attempt, return null instead of throwing
                if (attempt === retries) {
                    console.error('All retry attempts failed for stock data');
                    return null; // Return null instead of throwing
                }
                
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
        return null;
    } catch (error) {
        // Ultimate catch-all to prevent any uncaught exceptions
        console.error('Unexpected error in fetchStockData:', error);
        return null;
    }
}

export { fetchStockData };
