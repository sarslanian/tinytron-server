const generateTime = (x, y, color) => {

    const now = new Date();
    const options = { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true };
    const timeString = now.toLocaleTimeString('en-US', options);
    
    let [hh, mm] = timeString.split(':');
    hh = hh.replace(/^0/, ' ');

    return [{ t: 't', v: `${hh}`, x: x, y: y, c: color }, { t: 't', v: `:`, x: x+7, y: y, c: color }, { t: 't', v: `${mm}`, x: x+10, y: y, c: color }];
}

export {generateTime}