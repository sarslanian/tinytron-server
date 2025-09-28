// NFL team color mappings (optimized for LED matrix visibility)
const TEAM_COLORS = {
    'ARI': '0xCC3333', 'ATL': '0xCC0000', 'BAL': '0x3333CC', 'BUF': '0x0066CC',
    'CAR': '0x0066CC', 'CHI': '0x333333', 'CIN': '0xFF6600', 'CLE': '0x663300',
    'DAL': '0x0066CC', 'DEN': '0xFF6600', 'DET': '0x0066CC', 'GB': '0x00CC66',
    'HOU': '0x0066CC', 'IND': '0x0066CC', 'JAX': '0x0066CC', 'KC': '0xCC0000',
    'LV': '0x666666', 'LAC': '0x0066CC', 'LAR': '0x0066CC', 'MIA': '0x00CCCC',
    'MIN': '0x9900CC', 'NE': '0x0066CC', 'NO': '0xFFCC00', 'NYG': '0x0066CC',
    'NYJ': '0x00CC00', 'PHI': '0x0066CC', 'PIT': '0xFFCC00', 'SF': '0xCC0000',
    'SEA': '0x0066CC', 'TB': '0xCC0000', 'TEN': '0x0066CC', 'WAS': '0xCC0000'
};

// Global variables for game rotation
let currentGameIndex = 0;
let games = [];
let lastFetchTime = 0;
let rotationStartTime = 0; // When the current rotation cycle started
const FETCH_INTERVAL = 30000; // 30 seconds
const GAME_DISPLAY_TIME = 5000; // 10 seconds per game

// Fetch NFL data from ESPN API
const fetchNFLData = async () => {
    try {
        const today = new Date();
        const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
        const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${dateString}`);
        const data = await response.json();
        return data.events || [];
    } catch (error) {
        console.error('Error fetching NFL data:', error);
        return [];
    }
};

// Parse game data to extract relevant information
const parseGameData = (game) => {
    if (!game.competitions || game.competitions.length === 0) {
        console.log('Game has no competitions:', game.id);
        return null;
    }
    
    const competition = game.competitions[0];
    const competitors = competition.competitors || [];
    
    if (competitors.length < 2) {
        console.log('Game has insufficient competitors:', game.id, competitors.length);
        return null;
    }
    
    const homeTeam = competitors.find(c => c.homeAway === 'home');
    const awayTeam = competitors.find(c => c.homeAway === 'away');
    
    if (!homeTeam || !awayTeam) {
        console.log('Missing home or away team:', game.id, { homeTeam: !!homeTeam, awayTeam: !!awayTeam });
        return null;
    }
    
    const gameData = {
        id: game.id,
        homeTeam: {
            name: homeTeam.team.abbreviation,
            fullName: homeTeam.team.displayName,
            score: homeTeam.score || '0',
            color: TEAM_COLORS[homeTeam.team.abbreviation] || '0xffffff'
        },
        awayTeam: {
            name: awayTeam.team.abbreviation,
            fullName: awayTeam.team.displayName,
            score: awayTeam.score || '0',
            color: TEAM_COLORS[awayTeam.team.abbreviation] || '0xffffff'
        },
        status: competition.status,
        situation: competition.situation,
        week: game.week?.number || 'N/A'
    };
    
    console.log(`Parsed game: ${gameData.awayTeam.name} @ ${gameData.homeTeam.name}`);
    return gameData;
};

// Create field visualization with ball position
const createField = (ballPosition = null) => {
    const fieldElements = [
        // Field background
        {
            "type": "shape",
            "shape": "rect",
            "fill": "0x00ff00",
            "start_x": 5,
            "start_y": 30,
            "width": 54,
            "height": 2
        },
        // Goal posts
        {
            "type": "shape",
            "shape": "rect",
            "fill": "0xffcc00",
            "start_x": 61,
            "start_y": 28,
            "width": 1,
            "height": 4
        },
        {
            "type": "shape",
            "shape": "rect",
            "fill": "0xffcc00",
            "start_x": 59,
            "start_y": 25,
            "width": 1,
            "height": 4
        },
        {
            "type": "shape",
            "shape": "rect",
            "fill": "0xffcc00",
            "start_x": 63,
            "start_y": 25,
            "width": 1,
            "height": 4
        },
        {
            "type": "shape",
            "shape": "rect",
            "fill": "0xffcc00",
            "start_x": 60,
            "start_y": 28,
            "width": 4,
            "height": 1
        },
        {
            "type": "shape",
            "shape": "rect",
            "fill": "0xffcc00",
            "start_x": 2,
            "start_y": 28,
            "width": 1,
            "height": 4
        },
        {
            "type": "shape",
            "shape": "rect",
            "fill": "0xffcc00",
            "start_x": 0,
            "start_y": 25,
            "width": 1,
            "height": 4
        },
        {
            "type": "shape",
            "shape": "rect",
            "fill": "0xffcc00",
            "start_x": 4,
            "start_y": 25,
            "width": 1,
            "height": 4
        },
        {
            "type": "shape",
            "shape": "rect",
            "fill": "0xffcc00",
            "start_x": 1,
            "start_y": 28,
            "width": 4,
            "height": 1
        }
    ];

    // Add ball position if provided
    if (ballPosition !== null) {
        fieldElements.push({
            "type": "shape",
            "shape": "rect",
            "fill": "0xffffff",
            "start_x": ballPosition,
            "start_y": 30,
            "width": 1,
            "height": 2
        });
    }

    return fieldElements;
};

// Calculate ball position on the field
const calculateBallPosition = (gameData) => {
    if (!gameData.situation || !gameData.situation.yardLine) {
        return null; // No ball position available
    }

    const yardLine = gameData.situation.yardLine;
    const possession = gameData.situation.possession;
    
    // Field is 54 pixels wide (from x=5 to x=59)
    // NFL field is 100 yards (0-50 each way from midfield)
    // We need to map yard line to pixel position
    
    let ballPosition;
    
    if (possession === gameData.homeTeam.id) {
        // Home team has the ball - they're going towards the right (away team's end zone)
        // Yard line represents distance from home team's goal line
        // 0 = home goal line (left), 50 = midfield, 100 = away goal line (right)
        ballPosition = 5 + Math.round((yardLine / 100) * 54);
    } else {
        // Away team has the ball - they're going towards the left (home team's end zone)
        // Yard line represents distance from away team's goal line
        // We need to flip this so right side is always the direction they're going
        ballPosition = 5 + Math.round(((100 - yardLine) / 100) * 54);
    }
    
    // Ensure ball position is within field bounds
    ballPosition = Math.max(5, Math.min(59, ballPosition));
    
    return ballPosition;
};

// Create game display elements
const createGameDisplay = (gameData) => {
    const ballPosition = calculateBallPosition(gameData);
    const elements = createField(ballPosition);
    
    // Add team names and scores
    elements.push(
        {
            "type": "text",
            "text": gameData.awayTeam.name,
            "x": 0,
            "y": 5,
            "color": gameData.awayTeam.color,
            "font": "Atadore"
        },
        {
            "type": "text",
            "text": gameData.homeTeam.name,
            "x": 0,
            "y": 15,
            "color": gameData.homeTeam.color,
            "font": "Atadore"
        },
        {
            "type": "text",
            "text": gameData.awayTeam.score,
            "x": 25,
            "y": 5,
            "color": "0xffcc00",
            "font": "Atadore"
        },
        {
            "type": "text",
            "text": gameData.homeTeam.score,
            "x": 25,
            "y": 15,
            "color": "0xffcc00",
            "font": "Atadore"
        }
    );
    
    // Add game status
    if (gameData.status) {
        const status = gameData.status;
        if (status.type && status.type.state === 'in') {
            // Game in progress
            elements.push(
                {
                    "type": "text",
                    "text": `Q${status.period}`,
                    "x": 44,
                    "y": 5,
                    "color": "0xffffff",
                    "font": "Atadore",
                    "size": 1
                },
                {
                    "type": "text",
                    "text": status.displayClock || "0:00",
                    "x": 39,
                    "y": 16,
                    "color": "0xffffff",
                    "font": "Atadore",
                    "size": 1
                }
            );
            
            // Add down and distance if available
            if (gameData.situation && gameData.situation.shortDownDistanceText) {
                elements.push({
                    "type": "text",
                    "text": gameData.situation.shortDownDistanceText,
                    "x": 10,
                    "y": 25,
                    "color": "0xffffff",
                    "font": "Atadore",
                    "size": 1
                });
            }
        } else if (status.type && status.type.state === 'pre') {
            // Game scheduled
            elements.push({
                "type": "text",
                "text": "PRE",
                "x": 35,
                "y": 11,
                "color": "0xffffff",
                "font": "Atadore"
            });
        } else if (status.type && status.type.state === 'post') {
            // Game finished
            elements.push({
                "type": "text",
                "text": "FIN",
                "x": 40,
                "y": 11,
                "color": "0xffffff",
                "font": "Atadore"
            });
        }
    }
    
    return elements;
};

// Create "No Games" display
const createNoGamesDisplay = () => {
    const elements = createField(null);
    elements.push({
        "type": "text",
        "text": "NO GAMES",
        "x": 25,
        "y": 11,
        "color": "0xffffff",
        "font": "Atadore"
    });
    return elements;
};

const nfl = async () => {
    const now = Date.now();
    
    // Fetch new data if needed
    if (now - lastFetchTime > FETCH_INTERVAL || games.length === 0) {
        const rawGames = await fetchNFLData();
        const newGames = rawGames.map(parseGameData).filter(game => game !== null);
        
        // If we have existing games, maintain the rotation state
        if (games.length > 0) {
            // Calculate how many games we should have shown by now
            const timeSinceRotationStart = now - rotationStartTime;
            const totalGamesShown = Math.floor(timeSinceRotationStart / GAME_DISPLAY_TIME);
            
            // Continue from where we left off, but use the new game count
            currentGameIndex = totalGamesShown % newGames.length;
            console.log(`Data refreshed. Continuing rotation at game ${currentGameIndex + 1}/${newGames.length} (${totalGamesShown} games shown since rotation start)`);
        } else {
            // First time loading games
            currentGameIndex = 0;
            rotationStartTime = now;
            console.log(`Initial load: ${newGames.length} games`);
        }
        
        // Reset rotation start time if we've completed a full cycle
        // This ensures we don't get stuck on the last game
        const timeSinceRotationStart = now - rotationStartTime;
        const totalCycles = Math.floor(timeSinceRotationStart / (GAME_DISPLAY_TIME * newGames.length));
        if (totalCycles > 0) {
            rotationStartTime = now - (timeSinceRotationStart % (GAME_DISPLAY_TIME * newGames.length));
            console.log(`Reset rotation start time after ${totalCycles} complete cycles`);
        }
        
        games = newGames;
        lastFetchTime = now;
    }
    
    // Handle no games case
    if (games.length === 0) {
        return createNoGamesDisplay();
    }
    
    // Calculate which game should be displayed based on rotation start time
    const timeSinceRotationStart = now - rotationStartTime;
    const gamesShown = Math.floor(timeSinceRotationStart / GAME_DISPLAY_TIME);
    const targetGameIndex = gamesShown % games.length;
    
    // Debug logging
    console.log(`Rotation debug: timeSinceStart=${timeSinceRotationStart}ms, gamesShown=${gamesShown}, targetIndex=${targetGameIndex}, currentIndex=${currentGameIndex}, totalGames=${games.length}`);
    
    // Update current game index if it has changed
    if (targetGameIndex !== currentGameIndex) {
        currentGameIndex = targetGameIndex;
        console.log(`Switching to game ${currentGameIndex + 1}/${games.length} (${games[currentGameIndex].awayTeam.name} @ ${games[currentGameIndex].homeTeam.name})`);
    }
    
    // Display current game
    const currentGame = games[currentGameIndex];
    return createGameDisplay(currentGame);
}

export {nfl};