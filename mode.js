// Mode class example
export class Mode {
    constructor(name, frequency, dataCallback) {
        this.name = name;
        this.frequency = frequency;
        this.dataCallback = dataCallback;  // This is the async function to get data
    }

    // Return data from the callback, ensuring it handles async logic
    async getData() {
        return await this.dataCallback();
    }
}
