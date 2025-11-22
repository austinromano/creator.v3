import { GovernanceConfig, Proposal, ProposalAction } from '../types';

/**
 * Decentralized Governance System
 * Token holders can vote on proposals and shape the platform
 */

export class GovernanceSystem {
  private proposals: Map<string, Proposal> = new Map();
  private votes: Map<string, Map<string, Vote>> = new Map(); // proposalId -> (voter -> vote)
  private config: GovernanceConfig;

  constructor(config: GovernanceConfig) {
    this.config = config;
  }

  /**
   * Create a new proposal
   */
  createProposal(
    proposer: string,
    proposerBalance: number,
    title: string,
    description: string,
    actions: ProposalAction[],
    votingDuration: number = 7 * 24 * 60 * 60 * 1000 // 7 days default
  ): Proposal | { error: string } {
    // Check if proposer has enough tokens
    if (proposerBalance < this.config.proposalThreshold) {
      return {
        error: `Insufficient tokens. Need ${this.config.proposalThreshold} tokens to create proposal`,
      };
    }

    const proposal: Proposal = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      proposer,
      created: new Date().toISOString(),
      votingEnds: new Date(Date.now() + votingDuration).toISOString(),
      status: 'active',
      votes: {
        for: 0,
        against: 0,
        abstain: 0,
      },
      actions,
    };

    this.proposals.set(proposal.id, proposal);
    this.votes.set(proposal.id, new Map());

    return proposal;
  }

  /**
   * Vote on a proposal
   */
  vote(
    proposalId: string,
    voter: string,
    voteType: 'for' | 'against' | 'abstain',
    votingPower: number
  ): { success: boolean; message: string } {
    const proposal = this.proposals.get(proposalId);

    if (!proposal) {
      return { success: false, message: 'Proposal not found' };
    }

    if (proposal.status !== 'active') {
      return { success: false, message: 'Proposal is not active' };
    }

    // Check if voting period ended
    if (new Date(proposal.votingEnds) < new Date()) {
      return { success: false, message: 'Voting period has ended' };
    }

    const proposalVotes = this.votes.get(proposalId)!;

    // Check if already voted
    if (proposalVotes.has(voter)) {
      return { success: false, message: 'Already voted on this proposal' };
    }

    // Record vote
    const vote: Vote = {
      voter,
      voteType,
      votingPower,
      timestamp: new Date().toISOString(),
    };

    proposalVotes.set(voter, vote);

    // Update proposal vote counts
    proposal.votes[voteType] += votingPower;

    return { success: true, message: 'Vote recorded successfully' };
  }

  /**
   * Execute proposal if passed
   */
  executeProposal(
    proposalId: string,
    totalSupply: number
  ): { success: boolean; message: string } {
    const proposal = this.proposals.get(proposalId);

    if (!proposal) {
      return { success: false, message: 'Proposal not found' };
    }

    if (proposal.status !== 'active') {
      return { success: false, message: 'Proposal is not active' };
    }

    // Check if voting period ended
    if (new Date(proposal.votingEnds) > new Date()) {
      return { success: false, message: 'Voting period not ended yet' };
    }

    // Calculate results
    const totalVotes = proposal.votes.for + proposal.votes.against + proposal.votes.abstain;
    const participationRate = (totalVotes / totalSupply) * 100;

    // Check quorum
    if (participationRate < this.config.quorumRequired) {
      proposal.status = 'rejected';
      this.proposals.set(proposalId, proposal);
      return {
        success: false,
        message: `Quorum not met. Required: ${this.config.quorumRequired}%, Got: ${participationRate.toFixed(2)}%`,
      };
    }

    // Check if passed (simple majority of votes)
    const passPercentage = (proposal.votes.for / totalVotes) * 100;

    if (passPercentage > 50) {
      proposal.status = 'passed';
      this.proposals.set(proposalId, proposal);

      // Execute actions
      this.executeActions(proposal.actions);

      proposal.status = 'executed';
      this.proposals.set(proposalId, proposal);

      return { success: true, message: 'Proposal passed and executed' };
    } else {
      proposal.status = 'rejected';
      this.proposals.set(proposalId, proposal);
      return { success: false, message: 'Proposal rejected by voters' };
    }
  }

  /**
   * Execute proposal actions
   */
  private executeActions(actions: ProposalAction[]): void {
    actions.forEach((action) => {
      switch (action.type) {
        case 'parameter-change':
          console.log(`Executing parameter change: ${action.target} = ${action.value}`);
          // In production, update smart contract parameters
          break;

        case 'treasury-spend':
          console.log(`Executing treasury spend: ${action.value} to ${action.target}`);
          // In production, execute treasury transfer
          break;

        case 'feature-toggle':
          console.log(`Toggling feature: ${action.target} = ${action.value}`);
          // In production, enable/disable features
          break;
      }
    });
  }

  /**
   * Get proposal details
   */
  getProposal(proposalId: string): Proposal | null {
    return this.proposals.get(proposalId) || null;
  }

  /**
   * Get all proposals
   */
  getAllProposals(): Proposal[] {
    return Array.from(this.proposals.values()).sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );
  }

  /**
   * Get active proposals
   */
  getActiveProposals(): Proposal[] {
    return this.getAllProposals().filter((p) => p.status === 'active');
  }

  /**
   * Get user's vote on a proposal
   */
  getUserVote(proposalId: string, voter: string): Vote | null {
    const proposalVotes = this.votes.get(proposalId);
    return proposalVotes?.get(voter) || null;
  }

  /**
   * Get voting statistics
   */
  getVotingStats(proposalId: string): VotingStats | null {
    const proposal = this.proposals.get(proposalId);
    const proposalVotes = this.votes.get(proposalId);

    if (!proposal || !proposalVotes) {
      return null;
    }

    const totalVotes = proposal.votes.for + proposal.votes.against + proposal.votes.abstain;

    return {
      proposalId,
      totalVoters: proposalVotes.size,
      totalVotingPower: totalVotes,
      forPercentage: totalVotes > 0 ? (proposal.votes.for / totalVotes) * 100 : 0,
      againstPercentage: totalVotes > 0 ? (proposal.votes.against / totalVotes) * 100 : 0,
      abstainPercentage: totalVotes > 0 ? (proposal.votes.abstain / totalVotes) * 100 : 0,
      timeRemaining: this.getTimeRemaining(proposal.votingEnds),
      status: proposal.status,
    };
  }

  /**
   * Get time remaining for voting
   */
  private getTimeRemaining(votingEnds: string): number {
    const endTime = new Date(votingEnds).getTime();
    const now = Date.now();
    return Math.max(0, endTime - now);
  }

  /**
   * Delegate voting power
   */
  delegateVotingPower(delegator: string, delegate: string, amount: number): void {
    // In production, this would be tracked in smart contract
    console.log(`${delegator} delegated ${amount} voting power to ${delegate}`);
  }
}

/**
 * Quick Polls for Community Engagement
 * Lighter than formal governance proposals
 */
export class QuickPollSystem {
  private polls: Map<string, QuickPoll> = new Map();
  private pollVotes: Map<string, Map<string, string>> = new Map(); // pollId -> (voter -> optionId)

  /**
   * Create a quick poll
   */
  createPoll(
    creator: string,
    question: string,
    options: string[],
    duration: number = 24 * 60 * 60 * 1000 // 24 hours default
  ): QuickPoll {
    const poll: QuickPoll = {
      id: `poll_${Date.now()}`,
      creator,
      question,
      options: options.map((text, index) => ({
        id: `opt_${index}`,
        text,
        votes: 0,
      })),
      created: new Date().toISOString(),
      endsAt: new Date(Date.now() + duration).toISOString(),
      totalVotes: 0,
      active: true,
    };

    this.polls.set(poll.id, poll);
    this.pollVotes.set(poll.id, new Map());

    return poll;
  }

  /**
   * Vote on a poll
   */
  votePoll(
    pollId: string,
    voter: string,
    optionId: string
  ): { success: boolean; message: string } {
    const poll = this.polls.get(pollId);
    const votes = this.pollVotes.get(pollId);

    if (!poll || !votes) {
      return { success: false, message: 'Poll not found' };
    }

    if (!poll.active) {
      return { success: false, message: 'Poll is no longer active' };
    }

    if (new Date(poll.endsAt) < new Date()) {
      poll.active = false;
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

    return { success: true, message: 'Vote recorded' };
  }

  /**
   * Get poll results
   */
  getPollResults(pollId: string): QuickPoll | null {
    return this.polls.get(pollId) || null;
  }

  /**
   * Get all active polls
   */
  getActivePolls(): QuickPoll[] {
    return Array.from(this.polls.values()).filter((p) => p.active);
  }
}

// Types
interface Vote {
  voter: string;
  voteType: 'for' | 'against' | 'abstain';
  votingPower: number;
  timestamp: string;
}

interface VotingStats {
  proposalId: string;
  totalVoters: number;
  totalVotingPower: number;
  forPercentage: number;
  againstPercentage: number;
  abstainPercentage: number;
  timeRemaining: number;
  status: string;
}

interface QuickPoll {
  id: string;
  creator: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
  created: string;
  endsAt: string;
  totalVotes: number;
  active: boolean;
}

export default GovernanceSystem;
