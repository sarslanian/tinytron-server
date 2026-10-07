// In-memory college football filter — survives mode switches, resets on container restart.
// Shared between the Express API routes (index.js) and the CFB mode (applications/cfb.js).
//
//   all    — FBS games with at least one Power 4 (or ranked) team
//   ranked — games with at least one AP Top 25 team
//   teams  — games involving any of `teams` (ESPN team IDs)

export const CFB_FILTERS = ['all', 'ranked', 'teams'];

let config = { filter: 'ranked', teams: [] };

export const getCFBConfig = () => config;

export const setCFBConfig = ({ filter, teams }) => {
    if (filter !== undefined && !CFB_FILTERS.includes(filter)) {
        throw new Error(`filter must be one of: ${CFB_FILTERS.join(', ')}`);
    }
    if (teams !== undefined && !Array.isArray(teams)) {
        throw new Error('teams must be an array');
    }
    config = {
        filter: filter ?? config.filter,
        teams: teams ? teams.map(String) : config.teams,
    };
    console.log(`[CFB] Filter updated: ${config.filter}${config.filter === 'teams' ? ` (${config.teams.join(', ') || 'none'})` : ''}`);
};
