class CardsManager extends CardManager<Card> {
    constructor (public game: ElawaGame) {
        super(game, {
            getId: (card) => `card-${card.id}`,
            setupDiv: (card: Card, div: HTMLElement) => {
                div.dataset.cardId = ''+card.id;
            },
            setupFrontDiv: (card: Card, div: HTMLElement) => { 
                div.dataset.color = ''+card.color;
                div.dataset.number = ''+card.number;
            },
        });
    }
}