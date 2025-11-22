import { Poll, PollOption, Prediction, PredictionOutcome } from '../types';

/**
 * Interactive Stream Features
 * Real-time polls, predictions, and audience engagement tools
 */

export class InteractiveFeatures {
  private polls: Map<string, Poll> = new Map();
  private pollVotes: Map<string, Map<string, string>> = new Map(); // pollId -> (voter -> optionId)

  private predictions: Map<string, Prediction> = new Map();
  private predictionBets: Map<string, Map<string, PredictionBet[]>> = new Map(); // predictionId -> (outcomeId -> bets)

  /**
   * Create a poll during stream
   */
  createPoll(
    question: string,
    options: string[],
    duration: number = 60000, // 1 minute default
    creatorOnly: boolean = false
  ): Poll {
    const poll: Poll = {
      id: `poll_${Date.now()}`,
      question,
      options: options.map((text, index) => ({
        id: `opt_${index}`,
        text,
        votes: 0,
      })),
      created: new Date().toISOString(),
      endsAt: new Date(Date.now() + duration).toISOString(),
      totalVotes: 0,
      creatorOnly,
    };

    this.polls.set(poll.id, poll);
    this.pollVotes.set(poll.id, new Map());

    // Auto-close poll when time expires
    setTimeout(() => {
      this.closePoll(poll.id);
    }, duration);

    return poll;
  }

  /**
   * Vote on a poll
   */
  votePoll(
    pollId: string,
    voter: string,
    optionId: string
  ): { success: boolean; message: string; results?: Poll } {
    const poll = this.polls.get(pollId);
    const votes = this.pollVotes.get(pollId);

    if (!poll || !votes) {
      return { success: false, message: 'Poll not found' };
    }

    // Check if poll is still active
    if (new Date(poll.endsAt) < new Date()) {
      return { success: false, message: 'Poll has ended' };
    }

    // Check if already voted
    if (votes.has(voter)) {
      return { success: false, message: 'Already voted on this poll' };
    }

    // Find option
    const option = poll.options.find((o) => o.id === optionId);
    if (!option) {
      return { success: false, message: 'Invalid option' };
    }

    // Record vote
    votes.set(voter, optionId);
    option.votes++;
    poll.totalVotes++;

    return {
      success: true,
      message: 'Vote recorded!',
      results: poll,
    };
  }

  /**
   * Close poll and get final results
   */
  closePoll(pollId: string): Poll | null {
    const poll = this.polls.get(pollId);

    if (!poll) return null;

    // Mark as ended
    poll.endsAt = new Date().toISOString();

    return poll;
  }

  /**
   * Get poll results
   */
  getPollResults(pollId: string): Poll | null {
    return this.polls.get(pollId) || null;
  }

  /**
   * Get poll results with percentages
   */
  getPollResultsWithPercentages(pollId: string) {
    const poll = this.polls.get(pollId);

    if (!poll) return null;

    return {
      ...poll,
      options: poll.options.map((option) => ({
        ...option,
        percentage: poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0,
      })),
    };
  }

  /**
   * Create a prediction market
   */
  createPrediction(
    question: string,
    outcomes: Array<{ text: string; initialOdds: number }>,
    duration: number = 3600000 // 1 hour default
  ): Prediction {
    const prediction: Prediction = {
      id: `pred_${Date.now()}`,
      question,
      outcomes: outcomes.map((outcome, index) => ({
        id: `outcome_${index}`,
        text: outcome.text,
        odds: outcome.initialOdds,
        totalStaked: 0,
        participants: 0,
      })),
      created: new Date().toISOString(),
      resolved: false,
    };

    this.predictions.set(prediction.id, prediction);
    this.predictionBets.set(prediction.id, new Map());

    // Initialize outcome maps
    prediction.outcomes.forEach((outcome) => {
      this.predictionBets.get(prediction.id)!.set(outcome.id, []);
    });

    return prediction;
  }

  /**
   * Place a bet on prediction outcome
   */
  placeBet(
    predictionId: string,
    outcomeId: string,
    bettor: string,
    amount: number
  ): { success: boolean; message: string; bet?: PredictionBet } {
    const prediction = this.predictions.get(predictionId);
    const bets = this.predictionBets.get(predictionId);

    if (!prediction || !bets) {
      return { success: false, message: 'Prediction not found' };
    }

    if (prediction.resolved) {
      return { success: false, message: 'Prediction already resolved' };
    }

    const outcome = prediction.outcomes.find((o) => o.id === outcomeId);
    if (!outcome) {
      return { success: false, message: 'Invalid outcome' };
    }

    // Create bet
    const bet: PredictionBet = {
      bettor,
      outcomeId,
      amount,
      odds: outcome.odds,
      timestamp: new Date().toISOString(),
    };

    // Add bet to bets map
    const outcomeBets = bets.get(outcomeId)!;
    outcomeBets.push(bet);

    // Update outcome stats
    outcome.totalStaked += amount;
    outcome.participants = new Set(outcomeBets.map((b) => b.bettor)).size;

    // Recalculate odds based on new stakes
    this.recalculateOdds(predictionId);

    return {
      success: true,
      message: 'Bet placed successfully!',
      bet,
    };
  }

  /**
   * Recalculate odds based on total stakes
   */
  private recalculateOdds(predictionId: string): void {
    const prediction = this.predictions.get(predictionId);

    if (!prediction) return;

    const totalStaked = prediction.outcomes.reduce((sum, o) => sum + o.totalStaked, 0);

    if (totalStaked === 0) return;

    // Calculate odds using implied probability
    prediction.outcomes.forEach((outcome) => {
      const impliedProbability = outcome.totalStaked / totalStaked;

      // Odds = 1 / probability (with house edge)
      const houseEdge = 0.05; // 5% house edge
      outcome.odds = impliedProbability > 0 ? (1 - houseEdge) / impliedProbability : 10;

      // Cap odds between 1.1 and 100
      outcome.odds = Math.max(1.1, Math.min(100, outcome.odds));
    });
  }

  /**
   * Resolve prediction
   */
  resolvePrediction(
    predictionId: string,
    winningOutcomeId: string
  ): { success: boolean; message: string; payouts?: Map<string, number> } {
    const prediction = this.predictions.get(predictionId);
    const bets = this.predictionBets.get(predictionId);

    if (!prediction || !bets) {
      return { success: false, message: 'Prediction not found' };
    }

    if (prediction.resolved) {
      return { success: false, message: 'Already resolved' };
    }

    const winningOutcome = prediction.outcomes.find((o) => o.id === winningOutcomeId);
    if (!winningOutcome) {
      return { success: false, message: 'Invalid outcome' };
    }

    // Mark as resolved
    prediction.resolved = true;
    prediction.resolvedAt = new Date().toISOString();
    prediction.result = winningOutcome.text;

    // Calculate payouts
    const payouts = new Map<string, number>();
    const winningBets = bets.get(winningOutcomeId)!;

    winningBets.forEach((bet) => {
      const payout = bet.amount * bet.odds;
      const existing = payouts.get(bet.bettor) || 0;
      payouts.set(bet.bettor, existing + payout);
    });

    return {
      success: true,
      message: `Prediction resolved! Winning outcome: ${winningOutcome.text}`,
      payouts,
    };
  }

  /**
   * Get prediction details
   */
  getPrediction(predictionId: string): Prediction | null {
    return this.predictions.get(predictionId) || null;
  }

  /**
   * Get user's bets on a prediction
   */
  getUserBets(predictionId: string, bettor: string): PredictionBet[] {
    const bets = this.predictionBets.get(predictionId);

    if (!bets) return [];

    const userBets: PredictionBet[] = [];

    bets.forEach((outcomeBets) => {
      outcomeBets.forEach((bet) => {
        if (bet.bettor === bettor) {
          userBets.push(bet);
        }
      });
    });

    return userBets;
  }

  /**
   * Get active polls
   */
  getActivePolls(): Poll[] {
    const now = new Date();

    return Array.from(this.polls.values()).filter(
      (poll) => new Date(poll.endsAt) > now
    );
  }

  /**
   * Get active predictions
   */
  getActivePredictions(): Prediction[] {
    return Array.from(this.predictions.values()).filter((pred) => !pred.resolved);
  }
}

/**
 * Stream Games and Mini-Games
 * Interactive games viewers can play during stream
 */

export class StreamGames {
  private activeGames: Map<string, Game> = new Map();
  private scores: Map<string, Map<string, number>> = new Map(); // gameId -> (player -> score)

  /**
   * Start a trivia game
   */
  startTrivia(
    question: string,
    correctAnswer: string,
    wrongAnswers: string[],
    duration: number = 30000
  ): Game {
    const game: Game = {
      id: `game_${Date.now()}`,
      type: 'trivia',
      question,
      answers: [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5),
      correctAnswer,
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + duration).toISOString(),
      active: true,
      participants: 0,
    };

    this.activeGames.set(game.id, game);
    this.scores.set(game.id, new Map());

    setTimeout(() => {
      this.endGame(game.id);
    }, duration);

    return game;
  }

  /**
   * Submit trivia answer
   */
  submitAnswer(
    gameId: string,
    player: string,
    answer: string
  ): { success: boolean; correct: boolean; points?: number } {
    const game = this.activeGames.get(gameId);

    if (!game || !game.active) {
      return { success: false, correct: false };
    }

    // Check if already answered
    const scores = this.scores.get(gameId)!;
    if (scores.has(player)) {
      return { success: false, correct: false };
    }

    const correct = answer === game.correctAnswer;

    // Award points for correct answer
    // More points for faster answers
    const timeElapsed = Date.now() - new Date(game.startedAt).getTime();
    const maxTime = new Date(game.endsAt).getTime() - new Date(game.startedAt).getTime();
    const speedBonus = Math.max(0, 1 - timeElapsed / maxTime);

    const points = correct ? Math.floor(100 * (1 + speedBonus)) : 0;

    scores.set(player, points);
    game.participants++;

    return { success: true, correct, points };
  }

  /**
   * End game and get winners
   */
  endGame(gameId: string): { winners: Array<{ player: string; score: number }>; game: Game } | null {
    const game = this.activeGames.get(gameId);
    const scores = this.scores.get(gameId);

    if (!game || !scores) return null;

    game.active = false;

    // Get top scorers
    const winners = Array.from(scores.entries())
      .map(([player, score]) => ({ player, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return { winners, game };
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(gameId: string): Array<{ player: string; score: number }> {
    const scores = this.scores.get(gameId);

    if (!scores) return [];

    return Array.from(scores.entries())
      .map(([player, score]) => ({ player, score }))
      .sort((a, b) => b.score - a.score);
  }
}

// Types
interface PredictionBet {
  bettor: string;
  outcomeId: string;
  amount: number;
  odds: number;
  timestamp: string;
}

interface Game {
  id: string;
  type: 'trivia' | 'quiz' | 'prediction';
  question: string;
  answers: string[];
  correctAnswer: string;
  startedAt: string;
  endsAt: string;
  active: boolean;
  participants: number;
}

export default InteractiveFeatures;
