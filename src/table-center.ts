class TableCenter {
    private spots: CenterSpot[] = [];
    public hiddenToken: HiddenDeck<Token>;
    public fireCounter: Counter;
        
    constructor(private game: ElawaGame, gamedatas: ElawaGamedatas) {
        for (let i=0;i<6;i++) {
            this.spots.push(new CenterSpot(game, this, i, gamedatas.centerCards[i], gamedatas.centerCardsCount[i], gamedatas.centerTokens[i], gamedatas.centerTokensCount[i]));
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
        if (pile == -1) {
            this.fireCounter.toValue(newCount);
        } else {
            this.spots[pile].setNewToken(newToken, newCount);
        }
    }
    
    public setCardsSelectable(selectable: boolean) {
        this.spots.forEach(spot => spot.setCardSelectable(selectable));
    }
    
    public showLinkedTokens(pile: number, count: number) {
        const linked = [];
        if (this.game.getGameStateName() == 'takeCard') {
            for (let i=1;i<=count;i++) {
                linked.push((pile + i) % 6);
            }
        }

        this.spots.forEach(spot => spot.showLinked(linked.includes(spot.pile)));
    }
}