const HOUSE = 1;
const STORAGE = 2;
const HUMAN = 3;
const TOOL = 4;

class CardsManager extends CardManager<Card> {
    private storageStocks: LineStock<Token>[] = [];

    constructor (public game: ElawaGame) {
        super(game, {
            getId: (card) => `card-${card.id}`,
            setupDiv: (card: Card, div: HTMLElement) => {
                div.classList.add('elawa-card');
                div.dataset.cardId = ''+card.id;
                game.setTooltip(div.id, this.getTooltip(card));
            },
            setupFrontDiv: (card: Card, div: HTMLElement) => { 
                div.dataset.color = ''+card.color;
                div.dataset.number = ''+card.number;

                if (card.cardType == STORAGE) {
                    div.style.alignItems = 'center';
                    this.storageStocks[card.id] = new LineStock<Token>(game.tokensManager, div);
                    if (card.storedResources) {
                        this.storageStocks[card.id].addCards(card.storedResources);
                    }
                }
            },
        });
    }
    
    public addToken(cardId: number, tokenId: number): void {
        console.log(cardId, tokenId, this.storageStocks);
        this.storageStocks[cardId].addCard({id: tokenId} as Token);
    }

    private getType(type: number): string {
        let message = '';
        switch (type) {
            case 1: message = _("House"); break;
            case 2: message = _("Storage"); break;
            case 3: message = _("Human"); break;
            case 4: message = _("Tool"); break;
        }

        return message;
    }

    private getColor(color: number): string {
        let message = '';
        switch (color) {
            case 1: message = _("Blue"); break;
            case 2: message = _("Yellow"); break;
            case 3: message = _("Green"); break;
            case 4: message = _("Red"); break;
            case 5: message = _("Purple"); break;
        }

        return message;
    }

    private getPower(power: number): string {
        let message = '';
        switch (power) {
            case 10: message = _("When a player places this card in front of them, they take 1 visible card from the top of any pile. They do not take the associated resources."); break;
            case 11: message = _("When a player places this card in front of them, they take 1 resource at random from the resource pool."); break;
        }

        return message;
    }

    private getTooltip(card: Card): string {
        let message = `<strong>${_("Points:")}</strong> ${card.points}`;
        if (card.cardType == HOUSE) {
            message += ` / ${this.getColor(card.storageType)}`;
        } else if (card.cardType == STORAGE) {
            message += ` / ${this.game.tokensManager.getType(card.storageType)}`;
        } else if (card.cardType == TOOL) {
            message += ` / ${this.getType(card.storageType)}`;
        }

        message += `
        <br>
        <strong>${_("Type:")}</strong> ${this.getType(card.cardType)}
        <br>
        <strong>${_("Color:")}</strong> ${this.getColor(card.color)}
        <br>
        <strong>${_("Required resources:")}</strong> `;
        if (!card.discard && !card.resources.length) {
            message += _('None');
        } else {
            const resources = [];
            if (card.discard) {
                resources.push(_('discard 1 tribe card from hand'));
            }
            card.resources.forEach(type => resources.push(this.game.tokensManager.getType(type)));
            message += resources.join(', ');
        }

        if (card.power) {
            message += `
            <br>
            <strong>${_("Power:")}</strong> ${this.getPower(card.power)}`;
        }

        message += `
        <br>
        <strong>${_("Resources to take:")}</strong> ${card.tokens}`;
 
        return message;
    }
}