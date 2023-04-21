class TableCenter {
    private spots: CenterSpot[] = [];
    public hiddenToken: HiddenDeck<Token>;
    public fireCounter: Counter;
        
    constructor(private game: ElawaGame, gamedatas: ElawaGamedatas) {
        for (let i=0;i<6;i++) {
            this.spots.push(new CenterSpot(game, i, gamedatas.centerCards[i], gamedatas.centerCardsCount[i], gamedatas.centerTokens[i], gamedatas.centerTokensCount[i]));
        }

        this.hiddenToken = new HiddenDeck<Token>(game.tokensManager, document.getElementById(`center-stock`), {
            width: 68,
            height: 68,
            cardNumber: gamedatas.fireTokenCount,
            autoUpdateCardNumber: false,
        });
        this.hiddenToken.addCard(gamedatas.fireToken);

        this.fireCounter = new ebg.counter();
        this.fireCounter.create(`center-token-counter`);
        this.fireCounter.setValue(gamedatas.fireTokenCount);
    }

    public setNewCard(pile: number, newCard: Card, newCount: number) {
        this.spots[pile].setNewCard(newCard, newCount);
    }

    public setNewToken(pile: number, newToken: Token, newCount: number) {
        this.spots[pile].setNewToken(newToken, newCount);
    }
}