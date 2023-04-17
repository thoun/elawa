const isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;;
const log = isDebug ? console.log.bind(window.console) : function () { };

class PlayerTable {
    public playerId: number;
    public hand?: LineStock<Card>;
    public scores: LineStock<Card>[] = [];

    private currentPlayer: boolean;

    constructor(private game: ElawaGame, player: ElawaPlayer) {
        this.playerId = Number(player.id);
        this.currentPlayer = this.playerId == this.game.getPlayerId();

        let html = `
        <div id="player-table-${this.playerId}" class="player-table" style="--player-color: #${player.color};">
            <div class="name-wrapper">${player.name}</div>
        `;
        if (this.currentPlayer) {
            html += `
            <div class="block-with-text hand-wrapper">
                <div class="block-label">${_('Your hand')}</div>
                <div id="player-table-${this.playerId}-hand" class="hand cards"></div>
            </div>`;
        }
        html += `<div class="score cards">`;
        for (let i=0; i<5; i++) {
            html += `
            <div class="score-card-wrapper">
                <div id="player-table-${this.playerId}-score${i}" class="score card"></div>
                <div id="player-table-${this.playerId}-score${i}-cards" class="cards"></div>
            </div>`;
        }
        html += `
            </div>
        </div>
        `;
        dojo.place(html, document.getElementById('tables'));

        if (this.currentPlayer) {
            const handDiv = document.getElementById(`player-table-${this.playerId}-hand`);
            this.hand = new LineStock<Card>(this.game.cardsManager, handDiv, {
                sort: (a: Card, b: Card) => a.number - b.number,
            });
            this.hand.onCardClick = (card: Card) => {
                if (handDiv.classList.contains('selectable')) {
                    this.game.onHandCardClick(card);
                    this.hand.getCards().forEach(c => this.hand.getCardElement(c).classList.toggle('selected', c.id == card.id));
                }
            }
            
            this.hand.addCards(player.hand);
        }

        for (let i=0; i<5; i++) {
            const scoreDiv = document.getElementById(`player-table-${this.playerId}-score${i}-cards`);
            this.scores[i] = new LineStock<Card>(this.game.cardsManager, scoreDiv, {
                direction: 'column',
            });
            scoreDiv.style.setProperty('--card-overlap', '125px');
            this.scores[i].addCards(player.scoresCards[i]);
        }
    } 
    
    public setSelectable(selectable: boolean) {
        document.getElementById(`player-table-${this.playerId}-hand`).classList.toggle('selectable', selectable);
    }
    
    public placeScoreCard(card: Card) {
        this.scores[card.locationArg].addCard(card);
    }
}