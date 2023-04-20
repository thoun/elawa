class TokensManager extends CardManager<Token> {
    constructor (public game: ElawaGame) {
        super(game, {
            getId: (card) => `token-${card.id}`,
            setupDiv: (card: Token, div: HTMLElement) => {
                div.classList.add('token');
                div.dataset.cardId = ''+card.id;
            },
            setupFrontDiv: (card: Token, div: HTMLElement) => { 
                div.dataset.type = ''+card.type;
            },
        });
    }
}