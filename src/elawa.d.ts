/**
 * Your game interfaces
 */

interface Card {
    id: number;
    location: string;
    locationArg: number;
    points: number;
    color: number;
    number: number;
}

interface Token {
    id: number;
    location: string;
    locationArg: number;
    type: number;
}

interface ElawaPlayer extends Player {
    playerNo: number;
    handCount: number;
    hand?: Card[];
    chief: number;
    played: Card[];
    tokens: Token[];
}

interface ElawaGamedatas {
    current_player_id: string;
    decision: {decision_type: string};
    game_result_neutralized: string;
    gamestate: Gamestate;
    gamestates: { [gamestateId: number]: Gamestate };
    neutralized_player_id: string;
    notifications: {last_packet_id: string, move_nbr: string}
    playerorder: (string | number)[];
    players: { [playerId: number]: ElawaPlayer };
    tablespeed: string;

    // Add here variables you set up in getAllDatas
    centerCards: { [position: number]: Card };
    centerCardsCount: { [position: number]: number };
    centerTokens: { [position: number]: Token };
    centerTokensCount: { [position: number]: number };
    fireToken: Token;
    fireTokenCount: number;
    chieftainOption: number;
}

interface ElawaGame extends Game {
    cardsManager: CardsManager;
    tokensManager: TokensManager;
    chiefsManager: ChiefsManager;

    getPlayerId(): number;
    getPlayer(playerId: number): ElawaPlayer;
    getChieftainOption(): number;

    setTooltip(id: string, html: string): void;
    onCenterCardClick(pile: number): void;
    onHandCardClick(card: Card): void;
}

interface EnteringChooseMarketCardArgs {
    canPlaceOnLine: Card[];
    canAddToLine: boolean;
    canAddToHand: boolean;
    mustClose: boolean;
    canClose: boolean;
}

interface EnteringPlayCardArgs {
    canPlaceOnLine: Card[];
    canClose: boolean;
    onlyClose: boolean;
}

interface EnteringPlayHandCardArgs {
    canPlaceOnLine: Card[];
}

interface NotifTakeArgs {
    playerId: number;
    pile: number;
    newCount: number;
} 

// takeCard
interface NotifTakeCardArgs extends NotifTakeArgs {
    card: Card;
    newCard: Card | null;
} 

// takeToken
interface NotifTakeTokenArgs extends NotifTakeArgs {
    token: Token;
    newToken: Token | null;
} 

// playCard
interface NotifPlayCardArgs {
    playerId: number;
    newCount: number;
    card: Card;
    discardedTokens: Token[];
} 

// discardCard
interface NotifDiscardCardArgs {
    playerId: number;
    card: Card;
} 

// discardTokens
interface NotifDiscardTokensArgs {
    playerId: number;
    keptTokens: Token[];    
    discardedTokens: Token[];
}

// updateScore
interface NotifUpdateScoreArgs {
    playerId: number;
    playerScore: number;
} 
