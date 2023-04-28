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
                    div.classList.add('storage-stock');
                    this.storageStocks[card.id] = new LineStock<Token>(game.tokensManager, div);
                    if (card.storedResources) {
                        this.storageStocks[card.id].addCards(card.storedResources);
                    }
                }
            },
        });
    }
    
    public addToken(cardId: number, token: Token): void {
        this.storageStocks[cardId].addCard(token);
    }

    private getType(type: number): string {
        switch (type) {
            case 1: return _("House");
            case 2: return _("Storage");
            case 3: return _("Human");
            case 4: return _("Tool");
        }
    }

    private getColor(color: number): string {
        switch (color) {
            case 1: return _("Blue");
            case 2: return _("Yellow");
            case 3: return _("Green");
            case 4: return _("Red");
            case 5: return _("Purple");
        }
    }

    private getPower(power: number): string {
        switch (power) {
            case 10: return _("When a player places this card in front of them, they take 1 visible card from the top of any pile. They do not take the associated resources.");
            case 11: return _("When a player places this card in front of them, they take 1 resource at random from the resource pool.");
        }
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

    public storageCardHasTokenOfType(cardId: number, type: number): boolean {
        return this.storageStocks[cardId].getCards().some(card => card.type == type);
    }
}