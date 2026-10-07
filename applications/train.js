import { fetchCTAData } from "../fetch/cta.js";
import { generateTrainDisplay } from "../gennies/trainDisplay.js";

const train = async () => {
    try {
        const ctaData = await fetchCTAData("40710", "12");

        if (!ctaData) {
            return [{ t: 't', v: "CTA unavail", x: 1, y: 14, c: "0xFF0000" }];
        }

        return generateTrainDisplay(ctaData);
    } catch (error) {
        console.error('Error in train mode:', error);
        return [{ t: 't', v: "Train error", x: 1, y: 14, c: "0xFF0000" }];
    }
};

export { train };
