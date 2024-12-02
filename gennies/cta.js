import { DateTime } from 'luxon';


const destMapping = {
    Loop: 'LOOP',
    Kimball: "KMBL",
}

const generateCTA = async (data, x, y, color) => {
    console.log(data);
    if (!data) {
        return { type: "text", text: "Error", x: x, y: y, color: color };
    }

    const etaData = data.ctatt.eta;
    const trainsByDestination = {};

    etaData.forEach(eta => {
        const destinationKey = eta.destNm;
        const destination = destMapping[destinationKey] || destinationKey;
        const arrTime = eta.arrT[0];
        const parsedArrivalTime = DateTime.fromFormat(arrTime, 'yyyyMMdd HH:mm:ss', { zone: 'America/Chicago' });

        if (!parsedArrivalTime.isValid) {
            console.error(`Invalid date format for ${arrTime}`);
            return;
        }

        const currentTime = DateTime.now().setZone('America/Chicago');
        const timeDifference = Math.round(parsedArrivalTime.diff(currentTime, 'minutes').minutes);

        const displayTime = timeDifference <= 0 ? 'DUE' : timeDifference;

        if (!trainsByDestination[destination]) {
            trainsByDestination[destination] = [];
        }

        trainsByDestination[destination].push({ rn: eta.rn[0], time: displayTime });
    });

    console.log('Trains by destination:', trainsByDestination);

    let output = '';

    const lines = [];
    let loopLine = '';

    for (const [destination, trains] of Object.entries(trainsByDestination)) {
        const trainTimes = trains.map(train => train.time).join(',');
        const paddedDestination = destination.toUpperCase();

        const spaces = '.'.repeat(12 - trainTimes.length);

        const line = `${paddedDestination}${spaces}${trainTimes}`;

        if (destination === 'LOOP') {
            loopLine = line;
        } else {
            lines.push(line);
        }
    }

    if (loopLine) {
        lines.push(loopLine);
    }

    output = lines.join('\n');

    console.log('CTA API output:', output.trim());

    return { type: "text", text: output.trim(), x: x, y: y, color: color };
}

export { generateCTA };
