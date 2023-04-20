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
    hand?: Card[];
    chief: number;
    played: Card[];
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
    centerTokens: { [position: number]: Token };
}

interface ElawaGame extends Game {
    cardsManager: CardsManager;
    tokensManager: TokensManager;
    chiefsManager: ChiefsManager;

    getPlayerId(): number;
    getPlayer(playerId: number): ElawaPlayer;

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

// selectedCard
interface NotifSelectedCardArgs {
    playerId: number;
    card: Card;
    cancel: boolean;
} 

// revealCards
interface NotifRevealCardsArgs {
    cards: Card[];
}

// placeCardUnder
interface NotifPlayerCardArgs {
    card: Card;
    playerId: number;
}

interface NotifScoredCardArgs extends NotifPlayerCardArgs {
    playerScore: number;
    incScore: number;
}

interface NotifNewObjectivesArgs {
    objectives: number[];
}
