// In-memory MLB team filter — survives mode switches, resets on container restart.
// Shared between the Express API routes (index.js) and the MLB mode (applications/mlb.js).

let teamFilter = [];

export const getTeamFilter = () => teamFilter;

export const setTeamFilter = (teams) => {
    if (!Array.isArray(teams)) throw new Error('teams must be an array');
    teamFilter = teams;
    console.log(`[MLB] Team filter updated: ${teams.length === 0 ? 'all teams' : teams.join(', ')}`);
};
