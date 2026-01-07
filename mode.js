// Mode class example
export class Mode {
    constructor(name, frequency, dataCallback) {
        this.name = name;
        this.frequency = frequency;
        this.dataCallback = dataCallback;  // This is the async function to get data
    }

    // Return data from the callback, ensuring it handles async logic
    async getData() {
        try {
            return await this.dataCallback();
        } catch (error) {
            console.error(`Error in mode ${this.name} getData():`, error);
            // Return a safe fallback payload
            return [{ type: "text", text: "Error", x: 10, y: 10, color: "0xFF0000" }];
        }
    }
}
