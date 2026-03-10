export default async function handler(req, res) {
  
  // allow ESP32 to access this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // fetch the ESPN scoreboard — Vercel has no memory limits
    const response = await fetch(
      'http://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard'
    );
    
    const data = await response.json();
    
    // find the Dodgers game (team ID 19)
    const events = data.events || [];
    
    let dodgersGame = null;
    
    for (const event of events) {
      const competition = event.competitions[0];
      const competitors = competition.competitors;
      
      // check if either team is the Dodgers (id 19)
      const isDodgersGame = competitors.some(c => c.team.id === '19');
      
      if (isDodgersGame) {
        dodgersGame = { event, competition, competitors };
        break;
      }
    }
    
    // no Dodgers game today
    if (!dodgersGame) {
      return res.status(200).json({
        status: 'no_game',
        message: 'No Dodgers game today'
      });
    }
    
    const { event, competition, competitors } = dodgersGame;
    
    // figure out which competitor is home vs away
    const homeTeam = competitors.find(c => c.homeAway === 'home');
    const awayTeam = competitors.find(c => c.homeAway === 'away');
    
    // base game info
    const result = {
      status:        event.status.type.name,
      statusDisplay: event.status.type.description,
      homeTeam:      homeTeam.team.abbreviation,
      awayTeam:      awayTeam.team.abbreviation,
      homeScore:     homeTeam.score || '0',
      awayScore:     awayTeam.score || '0',
      inning:        competition.status.period || 0,
      homeRecord:    homeTeam.records?.[0]?.summary || '',
      awayRecord:    awayTeam.records?.[0]?.summary || '',
      gameDate:      event.date,
      venueName:     competition.venue?.fullName || '',
    };
    
    // add live situation if game is in progress
    if (competition.situation) {
      const sit = competition.situation;
      result.balls   = sit.balls   ?? 0;
      result.strikes = sit.strikes ?? 0;
      result.outs    = sit.outs    ?? 0;
      
      // current batter
      if (sit.batter) {
        result.batterName  = sit.batter.fullName || '';
        result.batterAvg   = sit.batter.statistics?.[0]?.displayValue || '';
      }
      
      // current pitcher
      if (sit.pitcher) {
        result.pitcherName = sit.pitcher.fullName || '';
        result.pitcherERA  = sit.pitcher.statistics?.[0]?.displayValue || '';
      }
      
      // base runners
      result.onFirst  = sit.onFirst  ?? false;
      result.onSecond = sit.onSecond ?? false;
      result.onThird  = sit.onThird  ?? false;
    }
    
    return res.status(200).json(result);
    
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
}
