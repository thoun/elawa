const SHADOW_COLORS = [
    'transparent',
    'orangered',
    'darkred',
    'black',
];

class TableCenter {
    private spots: CenterSpot[] = [];
    public hiddenToken: Deck<Token>;
    public fireCounter: Counter;
        
    constructor(private game: ElawaGame, gamedatas: ElawaGamedatas) {
        for (let i=0;i<6;i++) {
            this.spots.push(new CenterSpot(game, this, i, gamedatas.centerCards[i], gamedatas.centerCardsCount[i], gamedatas.centerTokens[i], gamedatas.centerTokensCount[i]));
        }

        this.hiddenToken = new Deck<Token>(game.tokensManager, document.getElementById(`center-stock`), {
            cardNumber: gamedatas.fireTokenCount,
            autoUpdateCardNumber: false,
        });
        if (gamedatas.fireToken) {
            this.hiddenToken.addCard(gamedatas.fireToken);
        }

        this.fireCounter = new ebg.counter();
        this.fireCounter.create(`center-token-counter`);
        this.fireCounter.setValue(gamedatas.fireTokenCount);
        this.setShadow(`center-token-counter`, gamedatas.fireTokenCount);
    }

    public setNewCard(pile: number, newCard: Card, newCount: number) {
        this.spots[pile].setNewCard(newCard, newCount);
    }

    public setNewToken(pile: number, newToken: Token, newCount: number) {
        if (pile == -1) {
            this.hiddenToken.setCardNumber(newCount);
            this.setShadow(`center-token-counter`, newCount);
            if (newToken) {
                this.hiddenToken.addCard(newToken);
            }
            this.fireCounter.toValue(newCount);
        } else {
            this.spots[pile].setNewToken(newToken, newCount);
        }
    }

    public setShadow(stockId: string, count: number) {

        document.getElementById(stockId).style.setProperty('--shadow-color', SHADOW_COLORS[Math.min(3, count)]);
    }
    
    public setCardsSelectable(selectable: boolean) {
        this.spots.forEach(spot => spot.setCardSelectable(selectable));
    }
    
    public setCardSelected(pile: number, card: Card, skip: number) {
        this.game.cardsManager.getCardElement(card).classList.add('selected');
        this.showLinkedTokens(pile, card.tokens, skip);
    }
    
    public unselectCard() {
        document.querySelector('#table-center .elawa-card.selected')?.classList.remove('selected');
        this.showLinkedTokens(0, 0);
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