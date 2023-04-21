const STORAGE = 2;

class CardsManager extends CardManager<Card> {
    private storageStocks: LineStock<Token>[] = [];

    constructor (public game: ElawaGame) {
        super(game, {
            getId: (card) => `card-${card.id}`,
            setupDiv: (card: Card, div: HTMLElement) => {
                div.classList.add('elawa-card');
                div.dataset.cardId = ''+card.id;
            },
            setupFrontDiv: (card: Card, div: HTMLElement) => { 
                div.dataset.color = ''+card.color;
                div.dataset.number = ''+card.number;

                if (card.cardType == STORAGE && card.storedResources) {
                    div.style.alignItems = 'center';
                    this.storageStocks[card.id] = new LineStock<Token>(game.tokensManager, div);
                    this.storageStocks[card.id].addCards(card.storedResources);
                }
            },
        });
    }
    
    public addToken(cardId: number, tokenId: number): void {
        this.storageStocks[cardId].addCard({id: tokenId} as Token);
    }
}