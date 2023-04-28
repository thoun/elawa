const isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;;
const log = isDebug ? console.log.bind(window.console) : function () { };

const BONE = 5;

class PlayerTable {
    public playerId: number;
    public voidStock: VoidStock<Card>;
    public hand?: LineStock<Card>;
    public chief: LineStock<number>;
    public played: LineStock<Card>;
    public tokensFree: LineStock<Token>;
    public tokensChief: SlotStock<Token>;

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
            <div class="visible-cards">
                <div id="player-table-${this.playerId}-played" class="cards">
                    <div class="chief-and-tokens">
                        <div id="player-table-${this.playerId}-tokens-free" class="tokens-free"></div>
                        <div id="player-table-${this.playerId}-chief" class="chief-card">
                            <div id="player-table-${this.playerId}-tokens-chief" class="tokens-chief"></div>
                        </div>
                    </div>
                </div>
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
        
        this.played = new LineStock<Card>(this.game.cardsManager, document.getElementById(`player-table-${this.playerId}-played`), {
            center: false,
        });
        this.played.addCards(player.played);
        
        this.tokensFree = new LineStock<Token>(this.game.tokensManager, document.getElementById(`player-table-${this.playerId}-tokens-free`), {
            center: false,
            sort: (a: Token, b: Token) => a.type - b.type,
        });
        this.tokensFree.onSelectionChange = (selection: Token[], lastChange: Token) => this.game.onTokenSelectionChange(selection);
        this.tokensChief = new SlotStock<Token>(this.game.tokensManager, document.getElementById(`player-table-${this.playerId}-tokens-chief`), {
            gap: `${this.game.getChieftainOption() == 2 ? 15 : 4}px`,
            direction: 'column',
            slotsIds: this.game.getChieftainOption() == 2 ? [0, 1, 2] : [0, 1, 2, 3],
        });
        if (this.playerId == (this.game as any).getActivePlayerId()) {
            this.tokensFree.addCards(player.tokens);
        } else {
            player.tokens.forEach((token, index) => this.tokensChief.addCard(token, undefined, { slot: index }));
        }
    }

    public freeResources() {
        this.tokensFree.addCards(this.tokensChief.getCards());
    }
    
    public setCardsSelectable(selectable: boolean, selectableCards: Card[] | null = null) {
        this.hand.setSelectionMode(selectable ? 'single' : 'none');
        this.hand.getCards().forEach(card => {
            const element = this.hand.getCardElement(card);
            const disabled = selectable && selectableCards != null && !selectableCards.some(s => s.id == card.id);
            element.classList.toggle('disabled', disabled);
            element.classList.toggle('selectable', selectable && !disabled);
        });
    }

    public setFreeTokensSelectable(selectable: boolean) {
        this.tokensFree.setSelectionMode(selectable ? 'multiple' : 'none');
    }

    private getTokenOfType(type: number): Token | null {
        return this.tokensFree.getCards().find(card => card.type == type);
    }

    private updateStorageButtons() {
        const someUsed = document.querySelectorAll('.storage-actions[data-used="true"]').length > 0;
        document.getElementById(`storeTokens_button`).classList.toggle('disabled', !someUsed);
        document.getElementById(`pass_button`).classList.toggle('disabled', someUsed);

        document.querySelectorAll('.storage-action button').forEach((button: HTMLElement) => 
            button.classList.toggle('disabled', (button.closest('.storage-actions') as HTMLElement).dataset.used == 'true' || this.getTokenOfType(Number(button.dataset.type)) == null)
        );
    }

    private createStorageAction(storageActions: HTMLElement, type: number) {
        const storageAction = document.createElement('div');
        storageAction.classList.add('storage-action');
        storageActions.appendChild(storageAction);
        const button = document.createElement('button');
        button.classList.add('bgabutton', 'bgabutton_blue');
        button.dataset.type = ''+type;
        storageAction.appendChild(button);
        button.innerHTML = _("Store ${type}").replace('${type}', `<div class="token-icon" data-type="${type}"></div>`);        
        const stock = new LineStock<Token>(this.game.tokensManager, storageAction);

        button.addEventListener('click', () => {
            const token = this.getTokenOfType(type);
            stock.addCard(token);
            storageActions.dataset.used = 'true';
            storageActions.dataset.tokenId = ''+token.id;

            const cancelButton = document.createElement('button');
            cancelButton.classList.add('cancel');
            cancelButton.innerText = '✖';
            storageAction.appendChild(cancelButton);
            cancelButton.addEventListener('click', () => {
                storageActions.dataset.used = 'false';
                this.tokensFree.addCard(stock.getCards()[0]);
                button.classList.remove('hidden');
                cancelButton.remove();
                storageActions.dataset.tokenId = '';
                this.updateStorageButtons();
            });

            setTimeout(() => {
                button.classList.add('hidden');
                this.updateStorageButtons();
            });
        })
    } 

    public setStoreButtons(storageCards: Card[], canPlaceBone: boolean) {
        storageCards.filter(card => canPlaceBone || card.canStoreResourceType).forEach(card => {
            const storageActions = document.createElement('div');
            storageActions.dataset.cardId = ''+card.id;
            storageActions.classList.add('storage-actions');
            storageActions.dataset.tokenId = '';
            this.game.cardsManager.getCardElement(card).appendChild(storageActions);

            if (card.canStoreResourceType) {
                if (!card.storageType) {
                    [1, 2, 3, 4].filter(type => this.getTokenOfType(type) && !this.game.cardsManager.storageCardHasTokenOfType(card.id, type)).forEach(type => {
                        this.createStorageAction(storageActions, type);
                    });
                } else {
                    this.createStorageAction(storageActions, card.storageType);
                }
            }
            if (canPlaceBone) {
                this.createStorageAction(storageActions, BONE);
            }
        });
    }

    public removeStoreButtons() {
        document.getElementById(`player-table-${this.playerId}-played`).querySelectorAll('.storage-actions').forEach(elem => elem.remove());
    }
    
    public storeTokens(tokens: { [cardId: number]: Token; }) {
        Object.entries(tokens).forEach(entry => 
            this.game.cardsManager.addToken(Number(entry[0]), entry[1])
        );
    }
    
    public cancelLastMoves(cards: Card[], tokens: Token[]) {
        this.hand?.addCards(cards);
        this.tokensFree.addCards(tokens);
    }
}