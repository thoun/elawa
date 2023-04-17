class TableCenter {
    public playerCards: SlotStock<Card>;
    public tableOver: SlotStock<Card>;
    public tableUnder: SlotStock<Card>;

    private objectivesManager: ObjectivesManager;
    private objectives: LineStock<number>;

    constructor(private game: ElawaGame, gamedatas: ElawaGamedatas) {
        const playersIds = (gamedatas.playerorder.length > 1 ? gamedatas.playerorder : Object.keys(gamedatas.players)).map(key => Number(key));
        const playerCount = playersIds.length;

        const slotSettings: SlotStockSettings<Card> = {
            wrap: 'nowrap',
            slotsIds: [],
            mapCardToSlot: card => card.locationArg,
        };
        for (let i=0; i<playerCount; i++) {
            slotSettings.slotsIds.push(i);
        }

        const playerCardsDiv = document.getElementById(`player-cards`);
        this.playerCards = new SlotStock<Card>(this.game.cardsManager, playerCardsDiv, {
            wrap: 'nowrap',
            slotsIds: playersIds,
            mapCardToSlot: card => card.locationArg,
        });
        this.tableOver = new SlotStock<Card>(this.game.cardsManager, document.getElementById(`table-over`), slotSettings);
        this.tableUnder = new SlotStock<Card>(this.game.cardsManager, document.getElementById(`table-under`), slotSettings);

        gamedatas.selected.forEach(card => this.playerCards.addCard(card, undefined, { visible: !!card.number }));
        this.tableOver.addCards(gamedatas.table);

        playersIds.forEach(playerId => playerCardsDiv.querySelector(`[data-slot-id="${playerId}"]`).appendChild(this.createPlayerBlock(playerId)));

        if (!gamedatas.objectives.length) {
            document.getElementById(`objectives`).style.display = 'none';
        }
        this.objectivesManager = new ObjectivesManager(this.game);
        this.objectives = new LineStock<number>(this.objectivesManager, document.getElementById(`objectives`));
        this.changeObjectives(gamedatas.objectives);
    }

    public createPlayerBlock(playerId: number) {
        const player = this.game.getPlayer(playerId);
        const block = document.createElement('div');
        block.classList.add('player-block');

        let url = (document.getElementById(`avatar_${playerId}`) as HTMLImageElement).src;
        // ? Custom image : Bga Image
        //url = url.replace('_32', url.indexOf('data/avatar/defaults') > 0 ? '' : '_184');
        block.innerHTML = `
            <div class="player-block-avatar" style="background-image: url('${url}');"></div>
            <div class="player-block-name" style="color: #${player.color}">${player.name}</div>
        `;

        return block;
    }
    
    public setPlacedCard(card: Card, currentPlayer: boolean) {
        this.playerCards.addCard(
            card, 
            currentPlayer ? undefined : { fromElement: document.getElementById(`player-table-${card.locationArg}`) }, 
            { visible: !!card.number }
        );
    }

    public cancelPlacedCard(card: Card) {
        this.playerCards.removeCard(card);
    }
    
    public revealCards(cards: Card[]) {
        cards.forEach(card => this.playerCards.setCardVisible(card, true));
    }
    
    public placeCardUnder(playerId: number, card: Card) {
        this.tableUnder.addCard(card);
        document.getElementById(`table-under`).querySelector(`[data-slot-id="${card.locationArg}"]`).appendChild(this.createPlayerBlock(playerId));
    }
    
    public moveTableLine() {
        this.tableOver.addCards(this.tableUnder.getCards());
        Array.from(document.querySelectorAll(`#table-under .player-block`)).forEach(elem => elem.remove());
    }

    public changeObjectives(objectives: number[]) {
        this.objectives.removeAll();
        this.objectives.addCards(objectives);
    }
}