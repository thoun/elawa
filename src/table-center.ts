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
        if (gamedatas.fireToken) {
            this.hiddenToken.addCard(gamedatas.fireToken);
        }

        this.fireCounter = new ebg.counter();
        this.fireCounter.create(`center-token-counter`);
        this.fireCounter.setValue(gamedatas.fireTokenCount);
    }

    public setNewCard(pile: number, newCard: Card, newCount: number) {
        this.spots[pile].setNewCard(newCard, newCount);
    }

    public setNewToken(pile: number, newToken: Token, newCount: number) {
        console.log(pile, newToken, newCount);
        if (pile == -1) {
            this.hiddenToken.setCardNumber(newCount);
            if (newToken) {
                this.hiddenToken.addCard(newToken);
            }
            this.fireCounter.toValue(newCount);
        } else {
            this.spots[pile].setNewToken(newToken, newCount);
        }
    }
    
    public setCardsSelectable(selectable: boolean) {
        this.spots.forEach(spot => spot.setCardSelectable(selectable));
    }
    
    public showLinkedTokens(pile: number, count: number, skip: number | null = null) {
        const linked = [];
        if (this.game.getGameStateName() == 'takeCard' || skip !== null) {
            for (let i=1;i<=count + (!skip ? 0 : 1);i++) {
                if (i == skip) {
                    continue;
                }
                linked.push((pile + i) % 6);
            }
        }

        this.spots.forEach(spot => spot.showLinked(linked.includes(spot.pile)));
    }
}