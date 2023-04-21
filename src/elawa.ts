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

    // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
    //                        action status bar (ie: the HTML links in the status bar).
    //
    public onUpdateActionButtons(stateName: string, args: any) {
        
        if ((this as any).isCurrentPlayerActive()) {
            switch (stateName) {
                case 'playCard':
                    (this as any).addActionButton(`pass_button`, _("Pass"), () => this.pass());
                    break;
                case 'discardCard':
                    (this as any).addActionButton(`cancel_button`, _("Cancel"), () => this.cancel());
                    break;
                case 'storeToken':
                    (this as any).addActionButton(`pass_button`, _("Pass"), () => this.pass()); // TODO
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

            // hand counter
            dojo.place(`<div class="counters">
                <div id="playerhand-counter-wrapper-${player.id}" class="playerhand-counter">
                    <div class="player-hand-card"></div> 
                    <span id="playerhand-counter-${player.id}"></span>
                </div>
            </div>`, `player_board_${player.id}`);

            const handCounter = new ebg.counter();
            handCounter.create(`playerhand-counter-${playerId}`);
            handCounter.setValue(player.handCount);
            this.handCounters[playerId] = handCounter;
        });

        this.setTooltipToClass('playerhand-counter', _('Number of cards in hand'));
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
        const fromCenter = notif.args.pile == -1;
        if (fromCenter) {
            this.tokensManager.flipCard(notif.args.token, {
                updateData: true,
                updateFront: true,
                updateBack: false,
            });
        }
        this.getPlayerTable(notif.args.playerId).tokensFree.addCard(notif.args.token, {
            fromElement: fromCenter ? document.getElementById(`center-stock`) : undefined,
        });
        if (notif.args.pile != -2) {
            this.notif_refillTokens(notif);
        }
    }

    notif_refillTokens(notif: Notif<NotifTakeTokenArgs>) {
        this.tableCenter.setNewToken(notif.args.pile, notif.args.newToken, notif.args.newCount);
    }

    notif_playCard(notif: Notif<NotifPlayCardArgs>) {
        const playerTable = this.getPlayerTable(notif.args.playerId);
        const currentPlayer = this.getPlayerId() == notif.args.playerId;
        playerTable.played.addCard(notif.args.card, {
            fromElement: currentPlayer ? undefined : document.getElementById(`player-table-${notif.args.playerId}-name`)
        });
        notif.args.discardedTokens.forEach(token => playerTable.tokensFree.removeCard(token));
        this.handCounters[notif.args.playerId].toValue(notif.args.newCount);
    }

    notif_discardCard(notif: Notif<NotifDiscardCardArgs>) {
        this.getPlayerTable(notif.args.playerId).hand.removeCard(notif.args.card);
    }

    notif_discardTokens(notif: Notif<NotifDiscardTokensArgs>) {
        const playerTable = this.getPlayerTable(notif.args.playerId);
        notif.args.discardedTokens.forEach(token => playerTable.tokensFree.removeCard(token));
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