declare const define;
declare const ebg;
declare const $;
declare const dojo: Dojo;
declare const _;
declare const g_gamethemeurl;

const ANIMATION_MS = 500;
const ACTION_TIMER_DURATION = 5;

const LOCAL_STORAGE_ZOOM_KEY = 'Elawa-zoom';

class Elawa implements ElawaGame {
    public cardsManager: CardsManager;
    public tokensManager: TokensManager;
    public chiefsManager: ChiefsManager;

    private zoomManager: ZoomManager;
    private animationManager: AnimationManager;
    private gamedatas: ElawaGamedatas;
    private tableCenter: TableCenter;
    private playersTables: PlayerTable[] = [];
    private handCounters: Counter[] = [];
    private resourcesCounters: Counter[][] = [];
    
    private TOOLTIP_DELAY = document.body.classList.contains('touch-device') ? 1500 : undefined;

    constructor() {
    }
    
    /*
        setup:

        This method must set up the game user interface according to current game situation specified
        in parameters.

        The method is called each time the game interface is displayed to a player, ie:
        _ when the game starts
        _ when a player refreshes the game page (F5)

        "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
    */

    public setup(gamedatas: ElawaGamedatas) {
        log( "Starting game setup" );
        
        this.gamedatas = gamedatas;

        log('gamedatas', gamedatas);


        this.cardsManager = new CardsManager(this);
        this.tokensManager = new TokensManager(this);
        this.chiefsManager = new ChiefsManager(this);
        this.animationManager = new AnimationManager(this);
        this.tableCenter = new TableCenter(this, gamedatas);
        this.createPlayerPanels(gamedatas);
        this.createPlayerTables(gamedatas);
        
        this.zoomManager = new ZoomManager({
            element: document.getElementById('table'),
            smooth: false,
            zoomControls: {
                color: 'black',
            },
            localStorageZoomKey: LOCAL_STORAGE_ZOOM_KEY,
            onDimensionsChange: () => {
                const tablesAndCenter = document.getElementById('tables-and-center');
                tablesAndCenter.classList.toggle('double-column', tablesAndCenter.clientWidth > 1600);
            },
        });

        if (gamedatas.lastTurn) {
            this.notif_lastTurn(false);
        }

        this.setupNotifications();
        this.setupPreferences();

        log( "Ending game setup" );
    }

    ///////////////////////////////////////////////////
    //// Game & client states

    // onEnteringState: this method is called each time we are entering into a new game state.
    //                  You can use this method to perform some user interface changes at this moment.
    //
    public onEnteringState(stateName: string, args: any) {
        log('Entering state: ' + stateName, args.args);

        switch (stateName) {
            case 'takeCard':
            case 'takeCardPower':
                this.onEnteringTakeCard(args.args);
                break;
            case 'playCard':
                this.onEnteringPlayCard(args.args);
                break;
            case 'discardCard':
                this.onEnteringDiscardCard(args.args);
                break;
            case 'storeTokens':
                this.onEnteringStoreTokens(args.args);
                break;
            case 'discardTokens':
                    if ((this as any).isCurrentPlayerActive()) {
                        this.getCurrentPlayerTable()?.setFreeTokensSelectable(true);
                    }
                    break;
        }
    }

    private onEnteringTakeCard(args: EnteringTakeCardArgs) {
        this.getPlayerTable(args.playerId).freeResources();
        if ((this as any).isCurrentPlayerActive()) {
            this.tableCenter.setCardsSelectable(true);
        }
    }

    private onEnteringPlayCard(args: EnteringPlayCardArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            this.getCurrentPlayerTable()?.setCardsSelectable(true, args.playableCards);
        }
    }

    private onEnteringDiscardCard(args: EnteringDiscardCardArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            this.getCurrentPlayerTable()?.setCardsSelectable(true, args.playableCards);
            const selectedCardDiv = this.getCurrentPlayerTable().hand.getCardElement(args.selectedCard);
            selectedCardDiv.classList.add('selected-discard');
        }
    }

    private onEnteringStoreTokens(args: EnteringStoreTokensArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            this.getCurrentPlayerTable()?.setStoreButtons(args.storageCards, args.canPlaceBone);
        }
    }

    public onLeavingState(stateName: string) {
        log( 'Leaving state: '+stateName );

        switch (stateName) {
            case 'takeCard':
            case 'takeCardPower':
                this.onLeavingTakeCard();
                break;
            case 'playCard':
                this.onLeavingPlayCard();
                break;
            case 'discardCard':
                this.onLeavingDiscardCard();
                break;
            case 'storeTokens':
                this.onLeavingStoreTokens();
                break;
           case 'discardTokens':
                if ((this as any).isCurrentPlayerActive()) {
                    this.getCurrentPlayerTable()?.setFreeTokensSelectable(false);
                }
                break;
        }
    }

    private onLeavingTakeCard() {
        this.tableCenter.setCardsSelectable(false);
    }

    private onLeavingPlayCard() {
        this.getCurrentPlayerTable()?.setCardsSelectable(false);
    }

    private onLeavingDiscardCard() {
        document.querySelectorAll('.selected-discard').forEach(elem => elem.classList.remove('selected-discard'));
    }

    private onLeavingStoreTokens() {
        this.getCurrentPlayerTable()?.removeStoreButtons();
    }

    // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
    //                        action status bar (ie: the HTML links in the status bar).
    //
    public onUpdateActionButtons(stateName: string, args: any) {
        
        if ((this as any).isCurrentPlayerActive()) {
            switch (stateName) {
                case 'playCard':
                    (this as any).addActionButton(`pass_button`, _("Pass"), () => this.pass());
                    break;
                case 'skipResource':
                    const skipResourceArgs = args as EnteringSkipResourceArgs;
                    for (let i=0; i < skipResourceArgs.resources.length; i++) {
                        let label = '';
                        if (i == 0) {
                            label = _("Don't skip resource, take ${resources}").replace('${resources}', skipResourceArgs.resources.slice(0, skipResourceArgs.resources.length - 1).map(type => `<div class="token-icon" data-type="${type}"></div>`).join(''));
                        } else {
                            const resources = skipResourceArgs.resources.slice();
                            const resource = resources.splice(i-1, 1)[0];
                            label = _("Skip ${resource}, take ${resources}").replace('${resource}', `<div class="token-icon" data-type="${resource}"></div>`).replace('${resources}', resources.map(type => `<div class="token-icon" data-type="${type}"></div>`).join(''));
                        }
                        (this as any).addActionButton(`skipResource${i}_button`, label, () => this.skipResource(i));
                        const skipResourceButton = document.getElementById(`skipResource${i}_button`);
                        skipResourceButton.addEventListener('mouseenter', () => this.tableCenter.showLinkedTokens(skipResourceArgs.pile, skipResourceArgs.resources.length - 1, i));
                        skipResourceButton.addEventListener('mouseleave', () => this.tableCenter.showLinkedTokens(skipResourceArgs.pile, 0));
                    }
                    break;
                case 'discardCard':
                    (this as any).addActionButton(`cancel_button`, _("Cancel"), () => this.cancel());
                    break;
                case 'storeTokens':
                    (this as any).addActionButton(`storeTokens_button`, _("Confirm stored resources"), () => this.storeTokens());
                    (this as any).addActionButton(`pass_button`, _("Pass"), () => this.pass());
                    document.getElementById(`storeTokens_button`).classList.add('disabled');
                    break;
                case 'discardTokens':
                    (this as any).addActionButton(`keepSelectedTokens_button`, _("Keep selected resources"), () => this.keepSelectedTokens());
                    const button = document.getElementById(`keepSelectedTokens_button`);
                    button.classList.add('disabled');
                    button.dataset.max = args.number;
                    break;
                    
            }
        }
    }

    ///////////////////////////////////////////////////
    //// Utility methods


    ///////////////////////////////////////////////////

    public setTooltip(id: string, html: string) {
        (this as any).addTooltipHtml(id, html, this.TOOLTIP_DELAY);
    }
    public setTooltipToClass(className: string, html: string) {
        (this as any).addTooltipHtmlToClass(className, html, this.TOOLTIP_DELAY);
    }

    public getPlayerId(): number {
        return Number((this as any).player_id);
    }

    public getPlayer(playerId: number): ElawaPlayer {
        return Object.values(this.gamedatas.players).find(player => Number(player.id) == playerId);
    }

    private getPlayerTable(playerId: number): PlayerTable {
        return this.playersTables.find(playerTable => playerTable.playerId === playerId);
    }

    private getCurrentPlayerTable(): PlayerTable | null {
        return this.playersTables.find(playerTable => playerTable.playerId === this.getPlayerId());
    }

    public getChieftainOption(): number {
        return this.gamedatas.chieftainOption;
    }

    public getGameStateName(): string {
        return this.gamedatas.gamestate.name;
    }

    private setupPreferences() {
        // Extract the ID and value from the UI control
        const onchange = (e) => {
          var match = e.target.id.match(/^preference_[cf]ontrol_(\d+)$/);
          if (!match) {
            return;
          }
          var prefId = +match[1];
          var prefValue = +e.target.value;
          (this as any).prefs[prefId].value = prefValue;
        }
        
        // Call onPreferenceChange() when any value changes
        dojo.query(".preference_control").connect("onchange", onchange);
        
        // Call onPreferenceChange() now
        dojo.forEach(
          dojo.query("#ingame_menu_content .preference_control"),
          el => onchange({ target: el })
        );
    }

    private getOrderedPlayers(gamedatas: ElawaGamedatas) {
        const players = Object.values(gamedatas.players).sort((a, b) => a.playerNo - b.playerNo);
        const playerIndex = players.findIndex(player => Number(player.id) === Number((this as any).player_id));
        const orderedPlayers = playerIndex > 0 ? [...players.slice(playerIndex), ...players.slice(0, playerIndex)] : players;
        return orderedPlayers;
    }

    private createPlayerPanels(gamedatas: ElawaGamedatas) {

        Object.values(gamedatas.players).forEach(player => {
            const playerId = Number(player.id);   

            let html = `<div class="counters">
                <div id="playerhand-counter-wrapper-${player.id}" class="playerhand-counter">
                    <div class="player-hand-card"></div> 
                    <span id="playerhand-counter-${player.id}"></span>
                </div>
            </div><div class="counters">`;

            for (let i = 1; i <= 5; i++) {
                html += `
                <div id="resource${i}-counter-wrapper-${player.id}" class="resource-counter">
                    <div class="token-icon" data-type="${i}"></div>
                    <span id="resource${i}-counter-${player.id}"></span>
                </div>`;
                if (i == 4) {
                    html += `</div><div class="counters">`;
                }
            }

            html += `
            </div>`;

            dojo.place(html, `player_board_${player.id}`);

            const handCounter = new ebg.counter();
            handCounter.create(`playerhand-counter-${playerId}`);
            handCounter.setValue(player.handCount);
            this.handCounters[playerId] = handCounter;

            this.resourcesCounters[playerId] = [];
            for (let i = 1; i <= 5; i++) {
                const resourceCounter = new ebg.counter();
                resourceCounter.create(`resource${i}-counter-${playerId}`);
                resourceCounter.setValue(player.tokens.filter(token => token.type == i).length);
                this.resourcesCounters[playerId][i] = resourceCounter;
            }
        });

        this.setTooltipToClass('playerhand-counter', _('Number of cards in hand'));
        this.setTooltipToClass('resource-counter', _('Number of resources by type'));
    }

    private createPlayerTables(gamedatas: ElawaGamedatas) {
        const orderedPlayers = this.getOrderedPlayers(gamedatas);

        orderedPlayers.forEach(player => 
            this.createPlayerTable(gamedatas, Number(player.id))
        );
    }

    private createPlayerTable(gamedatas: ElawaGamedatas, playerId: number) {
        const table = new PlayerTable(this, gamedatas.players[playerId]);
        this.playersTables.push(table);
    }

    private setScore(playerId: number, score: number) {
        (this as any).scoreCtrl[playerId]?.toValue(score);
    }

    public onCenterCardClick(pile: number): void {
        this.takeCard(pile);
    }

    public onHandCardClick(card: Card): void {
        if (this.gamedatas.gamestate.name == 'discardCard') {
            this.discardCard(card.id);
        } else {
            this.playCard(card.id);
        }
    }

    public onTokenSelectionChange(selection: Token[]): void {
        if (this.gamedatas.gamestate.name !== 'discardTokens') {
            return;
        }

        const button = document.getElementById(`keepSelectedTokens_button`);
        button.classList.toggle('disabled', selection.length != Number(button.dataset.max));
    }
  	
    public takeCard(pile: number) {
        if(!(this as any).checkAction('takeCard')) {
            return;
        }

        this.takeAction('takeCard', {
            pile
        });
    }
  	
    public playCard(id: number) {
        if(!(this as any).checkAction('playCard')) {
            return;
        }

        this.takeAction('playCard', {
            id
        });
    }
  	
    public skipResource(number: number) {
        if(!(this as any).checkAction('skipResource')) {
            return;
        }

        this.takeAction('skipResource', {
            number
        });
    }
  	
    public pass() {
        if(!(this as any).checkAction('pass')) {
            return;
        }

        this.takeAction('pass');
    }
  	
    public discardCard(id: number) {
        if(!(this as any).checkAction('discardCard')) {
            return;
        }

        this.takeAction('discardCard', {
            id
        });
    }
  	
    public cancel() {
        if(!(this as any).checkAction('cancel')) {
            return;
        }

        this.takeAction('cancel');
    }
  	
    public storeTokens() {
        if(!(this as any).checkAction('storeTokens')) {
            return;
        }

        const object = {};
        document.querySelectorAll('.storage-actions').forEach((storageActions: HTMLElement) => {
            if (storageActions.dataset.tokenId != '') {
                object[Number(storageActions.dataset.cardId)] = Number(storageActions.dataset.tokenId);
            }
        });

        this.takeAction('storeTokens', {
            tokens: JSON.stringify(object),
        });
    }
  	
    public keepSelectedTokens() {
        if(!(this as any).checkAction('keepSelectedTokens')) {
            return;
        }

        this.takeAction('keepSelectedTokens', {
            ids: this.getCurrentPlayerTable().tokensFree.getSelection().map(token => token.id).join(','),
        });
    }

    public takeAction(action: string, data?: any) {
        data = data || {};
        data.lock = true;
        (this as any).ajaxcall(`/elawa/elawa/${action}.html`, data, this, () => {});
    }

    ///////////////////////////////////////////////////
    //// Reaction to cometD notifications

    /*
        setupNotifications:

        In this method, you associate each of your game notifications with your local method to handle it.

        Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                your pylos.game.php file.

    */
    setupNotifications() {
        //log( 'notifications subscriptions setup' );

        const notifs = [
            ['takeCard', ANIMATION_MS],
            ['takeToken', ANIMATION_MS],
            ['playCard', ANIMATION_MS],
            ['discardCard', 1],
            ['storedTokens', ANIMATION_MS],
            ['discardTokens', 1],
            ['refillTokens', 1],
            ['updateScore', 1],
            ['lastTurn', 1],
        ];
    
        notifs.forEach((notif) => {
            dojo.subscribe(notif[0], this, `notif_${notif[0]}`);
            (this as any).notifqueue.setSynchronous(notif[0], notif[1]);
        });
    }

    notif_takeCard(notif: Notif<NotifTakeCardArgs>) {
        const currentPlayer = this.getPlayerId() == notif.args.playerId;
        const playerTable = this.getPlayerTable(notif.args.playerId);
        (currentPlayer ? playerTable.hand : playerTable.voidStock).addCard(notif.args.card);
        this.tableCenter.setNewCard(notif.args.pile, notif.args.newCard, notif.args.newCount);
    }

    notif_takeToken(notif: Notif<NotifTakeTokenArgs>) {
        const playerId = notif.args.playerId;
        const token = notif.args.token;
        const fromCenter = notif.args.pile == -1;
        if (fromCenter) {
            this.tokensManager.flipCard(token, {
                updateData: true,
                updateFront: true,
                updateBack: false,
            });
        }
        this.getPlayerTable(playerId).tokensFree.addCard(token, {
            fromElement: fromCenter ? document.getElementById(`center-stock`) : undefined,
        });
        if (notif.args.pile != -2) {
            this.notif_refillTokens(notif);
        }
        this.resourcesCounters[playerId][token.type].incValue(1);
    }

    notif_refillTokens(notif: Notif<NotifTakeTokenArgs>) {
        this.tableCenter.setNewToken(notif.args.pile, notif.args.newToken, notif.args.newCount);
    }

    notif_playCard(notif: Notif<NotifPlayCardArgs>) {
        const playerId = notif.args.playerId;
        const playerTable = this.getPlayerTable(playerId);
        const currentPlayer = this.getPlayerId() == playerId;
        playerTable.played.addCard(notif.args.card, {
            fromElement: currentPlayer ? undefined : document.getElementById(`player-table-${playerId}-name`)
        });
        notif.args.discardedTokens.forEach(token => {
            playerTable.tokensFree.removeCard(token);
            this.resourcesCounters[playerId][token.type].incValue(-1);
        });
        this.handCounters[playerId].toValue(notif.args.newCount);
    }

    notif_discardCard(notif: Notif<NotifDiscardCardArgs>) {
        this.getPlayerTable(notif.args.playerId).hand.removeCard(notif.args.card);
    }

    notif_storedTokens(notif: Notif<NotifStoredTokensArgs>) {
        this.getPlayerTable(notif.args.playerId).storeTokens(notif.args.tokens);
    }

    notif_discardTokens(notif: Notif<NotifDiscardTokensArgs>) {
        const playerId = notif.args.playerId;
        const playerTable = this.getPlayerTable(playerId);
        notif.args.discardedTokens.forEach(token => {
            playerTable.tokensFree.removeCard(token);
            this.resourcesCounters[playerId][token.type].incValue(-1);
        });
        notif.args.keptTokens.forEach((token, index) => playerTable.tokensChief.addCard(token, undefined, { slot: index }));
    }

    notif_updateScore(notif: Notif<NotifUpdateScoreArgs>) {
        this.setScore(notif.args.playerId, notif.args.playerScore);
    }
    
    /** 
     * Show last turn banner.
     */ 
    notif_lastTurn(animate: boolean = true) {
        dojo.place(`<div id="last-round">
            <span class="last-round-text ${animate ? 'animate' : ''}">${_("This is the final round!")}</span>
        </div>`, 'page-title');
    }

    /*private getColorName(color: number) {
        switch (color) {
            case 1: return _('Orange');
            case 2: return _('Pink');
            case 3: return _('Blue');
            case 4: return _('Green');
            case 5: return _('Purple');
        }
    }*/

    /* This enable to inject translatable styled things to logs or action bar */
    /* @Override */
    public format_string_recursive(log: string, args: any) {
        try {
            if (log && args && !args.processed) {

                if (typeof args.type !== 'string' || args.type[0] !== '<') {
                    args.type = `<div class="token-icon" data-type="${args.type}"></div>`;
                }

                for (const property in args) {
                    if (['left'].includes(property) && args[property][0] != '<') {
                        args[property] = `<strong>${_(args[property])}</strong>`;
                    }
                }
                
            }
        } catch (e) {
            console.error(log,args,"Exception thrown", e.stack);
        }
        return (this as any).inherited(arguments);
    }
}