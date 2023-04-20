const isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;;
const log = isDebug ? console.log.bind(window.console) : function () { };

class PlayerTable {
    public playerId: number;
    public voidStock: VoidStock<Card>;
    public hand?: LineStock<Card>;
    public chief: LineStock<number>;
    public played: LineStock<Card>;
    public tokens: LineStock<Token>;

    private currentPlayer: boolean;

    constructor(private game: ElawaGame, player: ElawaPlayer) {
        this.playerId = Number(player.id);
        this.currentPlayer = this.playerId == this.game.getPlayerId();

        let html = `
        <div id="player-table-${this.playerId}" class="player-table" style="--player-color: #${player.color};">
            <div id="player-table-${this.playerId}-name" class="name-wrapper">${player.name}</div>
        `;
        if (this.currentPlayer) {
            html += `
            <div class="block-with-text hand-wrapper">
                <div class="block-label">${_('Your hand')}</div>
                <div id="player-table-${this.playerId}-hand" class="hand cards"></div>
            </div>`;
        }
        html += `
        <div id="player-table-${this.playerId}-chief" class="cards"></div>
        <div id="player-table-${this.playerId}-played" class="cards"></div>
        <div id="player-table-${this.playerId}-tokens" class=""></div>
        </div>
        `;
        dojo.place(html, document.getElementById('tables'));

        if (this.currentPlayer) {
            const handDiv = document.getElementById(`player-table-${this.playerId}-hand`);
            this.hand = new LineStock<Card>(this.game.cardsManager, handDiv, {
                sort: (a: Card, b: Card) => a.number - b.number,
            });
            this.hand.onCardClick = (card: Card) => {
                //if (handDiv.classList.contains('selectable')) {
                    this.game.onHandCardClick(card);
                    //this.hand.getCards().forEach(c => this.hand.getCardElement(c).classList.toggle('selected', c.id == card.id));
                //}
            }
            
            this.hand.addCards(player.hand);

        }
        this.voidStock = new VoidStock<Card>(this.game.cardsManager, document.getElementById(`player-table-${this.playerId}-name`));

        this.chief = new LineStock<number>(this.game.chiefsManager, document.getElementById(`player-table-${this.playerId}-chief`));
        this.chief.addCard(player.chief);
        
        this.played = new LineStock<Card>(this.game.cardsManager, document.getElementById(`player-table-${this.playerId}-played`));
        this.played.addCards(player.played);
        
        this.tokens = new LineStock<Token>(this.game.tokensManager, document.getElementById(`player-table-${this.playerId}-tokens`));
        this.tokens.addCards(player.tokens);
    }
}