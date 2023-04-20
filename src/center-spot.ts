const CARD_OVERLAP = 40;
const FIRST_ANIMAL_SHIFT = 28;

class CenterSpot {

    public visibleCard: VisibleDeck<Card>;
    public visibleToken: VisibleDeck<Token>;

    constructor(
        private game: ElawaGame,
        public pile: number,
        card: Card,
        cardCount: number,
        token: Token,
        tokenCount: number,
    ) { 
        let html = `
        <div id="center-spot-${pile}" class="center-spot" style="--angle: ${this.getSpotAngle()}">
            <div id="center-spot-${pile}-token"></div>
            <div id="center-spot-${pile}-card"></div>
        `;
        html += `</div>`;

        dojo.place(html, 'table-center');

        const cardDeck = document.getElementById(`center-spot-${pile}-card`);
        this.visibleCard = new VisibleDeck<Card>(game.cardsManager, cardDeck, {
            width: 202,
            height: 282,
            cardNumber: cardCount,
            autoUpdateCardNumber: false,
        });
        if (card) {
            this.visibleCard.addCard(card);
        }
        cardDeck.addEventListener('click', () => this.game.onCenterCardClick(pile));

        this.visibleToken = new VisibleDeck<Token>(game.tokensManager, document.getElementById(`center-spot-${pile}-token`), {
            width: 68,
            height: 68,
            cardNumber: tokenCount,
            autoUpdateCardNumber: false,
        });
        this.visibleToken.addCard(token);

        /*dojo.toggleClass(`center-spot-${position}-ferry-card`, 'roomates', ferry?.roomates);
        let tooltip = `
        <h3>${_('Ferry')}</h3>
        <div>${_('Animals are loaded into Ferries.')}</div>
        <h4>${_('Gender')}</h4>
        <div class="noah-tooltip-with-list">${_(`In a given ferry, there must be:
<ul>
    <li>EITHER animals from a single gender</li>
    <li>OR a perfect alternating order Male/Female (or Female/Male)</li>
</ul>
As such, it’s always the second card played on an ferry which defines the sequence to be played!`)}</div>

        <h4>${_('Weight')}</h4>
        <div>${_('In a given ferry, the total weight cannot exceed 21 (otherwise, the ferry capsizes).')}</div>`;
        if (ferry?.roomates) {
            tooltip += `<h4>${_('Roomates')}</h4>
            <div>${_('in the Ark, it is impossible to place twice the same animal, whether male or female.')}</div>`;
        }
        game.setTooltip(`center-spot-${position}-ferry-card`, tooltip);

        if (token) {
            setTimeout(() => document.getElementById(`center-spot-${position}`).style.transform = this.getFerryTransform());
        }

        if (ferry) {
            ferry.animals?.forEach(animal => this.addAnimal(animal));
        } else {
            this.empty = true;            
            dojo.addClass(`center-spot-${this.position}-ferry-card`, 'empty');
        }
        this.updateCounter();*/
    }

    private getSpotAngle() {
        const angle = 60 * this.pile + 90;
        return `${angle > 180 ? angle-360 : angle}deg`;
    }
    
    public setNewCard(newCard: Card, newCount: number) {
        if (newCard) {
            this.visibleCard.addCard(newCard);
        }
        this.visibleCard.setCardNumber(newCount);
    }
    
    public setNewToken(newToken: Token, newCount: number) {
        if (newToken) {
            this.visibleToken.addCard(newToken);
        }
        this.visibleToken.setCardNumber(newCount);
    }
}