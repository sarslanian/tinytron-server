const generateTime = (x, y, color) => {

    const now = new Date();
    const options = { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true };
    const timeString = now.toLocaleTimeString('en-US', options);
    
    let [hh, mm] = timeString.split(':');
    hh = hh.replace(/^0/, ' ');

    return [{ type: "text", text: `${hh}`, x: x, y: y, color: color }, { type: "text", text: `:`, x: x+7, y: y, color: color }, { type: "text", text: `${mm}`, x: x+10, y: y, color: color } ];
}

export {generateTime}