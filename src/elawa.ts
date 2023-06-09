declare const define;
declare const ebg;
declare const $;
declare const dojo: Dojo;
declare const _;
declare const g_gamethemeurl;
declare const g_replayFrom;
declare const g_archive_mode;

const ANIMATION_MS = 500;
const ACTION_TIMER_DURATION = 5;

const LOCAL_STORAGE_ZOOM_KEY = 'Elawa-zoom';
const LOCAL_STORAGE_JUMP_TO_FOLDED_KEY = 'Elawa-jump-to-folded';

class Elawa implements ElawaGame {
    public cardsManager: CardsManager;
    public tokensManager: TokensManager;
    public chiefsManager: ChiefsManager;

    private zoomManager: ZoomManager;
    private animationManager: AnimationManager;
    private jumpToManager: JumpToManager;
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
        this.jumpToManager = new JumpToManager(this, {
            localStorageFoldedKey: LOCAL_STORAGE_JUMP_TO_FOLDED_KEY,
            topEntries: [
                new JumpToEntry(_('Fire'), 'table-center', { 'color': '#8f5f62' })
            ],
            entryClasses: 'round-point',
            defaultFolded: true,
        });
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

        if (gamedatas.cardScores) {
            this.notif_cardScores({
                args: {
                    cardScores: gamedatas.cardScores
                }
            } as any);
        }

        this.setupNotifications();
        this.setupPreferences();
        new HelpManager(this, { 
            buttons: [
                new BgaHelpPopinButton({
                    title: _("Card help").toUpperCase(),
                    html: this.getHelpHtml(),
                    onPopinCreated: () => this.getHelpHtml(),
                    buttonBackground: '#571f13',
                }),
                new BgaHelpExpandableButton({
                    unfoldedHtml: this.getColorAddHtml(),
                    foldedContentExtraClasses: 'color-help-folded-content',
                    unfoldedContentExtraClasses: 'color-help-unfolded-content',
                    expandedWidth: '120px',
                    expandedHeight: '210px',
                }),
            ]
        });

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
            case 'takeCardChiefPower':
                this.onEnteringTakeCard(args.args);
                break;
            case 'skipResource':
            case 'confirmTakeCard':
                this.onEnteringConfirmTakeCard(args.args);
                break;
            case 'playCard':
                this.onEnteringPlayCard(args.args);
                break;
            case 'discardCard':
                this.onEnteringDiscardCard(args.args);
                break;
            case 'discardTokens':
                    if ((this as any).isCurrentPlayerActive()) {
                        //this.getCurrentPlayerTable()?.setStoreButtons(false);
                        this.getCurrentPlayerTable()?.setFreeTokensSelectable(true);
                    }
                    break;
        }

        if (['playCard', 'chooseOneLess', 'discardCard'].includes(stateName)) {
            if ((this as any).isCurrentPlayerActive()) {
                this.getCurrentPlayerTable()?.setStoreButtons(true);
            }
        }
    }

    private onEnteringTakeCard(args: EnteringTakeCardArgs) {
        this.getPlayerTable(args.playerId).freeResources();
        if ((this as any).isCurrentPlayerActive()) {
            this.tableCenter.setCardsSelectable(true);
        }
    }

    private onEnteringConfirmTakeCard(args: EnteringConfirmTakeCardArgs) {
        if ((this as any).isCurrentPlayerActive()) {
            this.tableCenter.setCardSelected(args.pile, args.card, args.skip ?? 0);
        }
    }
    
    private setGamestateDescription(property: string = '') {
        const originalState = this.gamedatas.gamestates[this.gamedatas.gamestate.id];
        this.gamedatas.gamestate.description = `${originalState['description' + property]}`; 
        this.gamedatas.gamestate.descriptionmyturn = `${originalState['descriptionmyturn' + property]}`;
        (this as any).updatePageTitle();
    }

    private onEnteringPlayCard(args: EnteringPlayCardArgs) {
        if (args.canStore) {
            this.setGamestateDescription('Storage');
        }

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

    public onLeavingState(stateName: string) {
        log( 'Leaving state: '+stateName );

        switch (stateName) {
            case 'takeCard':
            case 'takeCardPower':
            case 'takeCardChiefPower':
                this.onLeavingTakeCard();
                break;
            case 'skipResource':
            case 'confirmTakeCard':
                this.onLeavingConfirmTakeCard();
                break;
            case 'playCard':
                this.onLeavingPlayCard();
                break;
            case 'discardCard':
                this.onLeavingDiscardCard();
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

    private onLeavingConfirmTakeCard() {
        this.tableCenter.unselectCard();
    }

    private onLeavingPlayCard() {
        this.getCurrentPlayerTable()?.setCardsSelectable(false);
    }

    private onLeavingDiscardCard() {
        document.querySelectorAll('.selected-discard').forEach(elem => elem.classList.remove('selected-discard'));
    }

    // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
    //                        action status bar (ie: the HTML links in the status bar).
    //
    public onUpdateActionButtons(stateName: string, args: any) {
        
        if ((this as any).isCurrentPlayerActive()) {
            switch (stateName) {
                case 'confirmTakeCard':
                    (this as any).addActionButton(`confirmTakeCard_button`, _("Confirm selected card"), () => this.confirm());
                    (this as any).addActionButton(`cancel_button`, _("Cancel"), () => this.cancel(), null, null, 'gray');
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
                    (this as any).addActionButton(`cancel_button`, _("Cancel"), () => this.cancel(), null, null, 'gray');
                    break;

                case 'playCard':
                    (this as any).addActionButton(`endTurn_button`, _("End turn"), () => this.endTurn());
                    break;
                case 'chooseOneLess':
                    const chooseOneLessArgs = args as EnteringChooseOneLessArgs;
                    if (chooseOneLessArgs.canSkipDiscard) {
                        (this as any).addActionButton(`chooseOneLess0_button`, _("Ignore sacrifice"), () => this.chooseOneLess(0));
                    }
                    chooseOneLessArgs.tokens.forEach(token => {
                        if (!document.getElementById(`chooseOneLess${token}_button`)) {
                            (this as any).addActionButton(`chooseOneLess${token}_button`, _("Ignore ${resource}").replace('${resource}', `<div class="token-icon" data-type="${token}"></div>`), () => this.chooseOneLess(token));
                        }
                    });

                    (this as any).addActionButton(`cancel_button`, _("Cancel"), () => this.cancel(), null, null, 'gray');
                    break;

                case 'discardCard':
                    (this as any).addActionButton(`cancel_button`, _("Cancel"), () => this.cancel(), null, null, 'gray');
                    break;
                case 'discardTokens':
                    (this as any).addActionButton(`keepSelectedTokens_button`, _("Keep selected resources"), () => this.keepSelectedTokens());
                    const button = document.getElementById(`keepSelectedTokens_button`);
                    button.classList.add('disabled');
                    button.dataset.max = args.number;
                    break;
                    
            }
        }

        if (['playCard', 'chooseOneLess', 'discardCard', 'takeCardChiefPower', 'takeCardChiefPower', 'discardTokens'].includes(stateName) && args.canCancelMoves) {
            (this as any).addActionButton(`cancelLastMoves_button`, _("Cancel last moves"), () => this.cancelLastMoves(), null, null, 'gray');
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

    public getCurrentPlayerTable(): PlayerTable | null {
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
          this.onPreferenceChange(prefId, prefValue);
        }
        
        // Call onPreferenceChange() when any value changes
        dojo.query(".preference_control").connect("onchange", onchange);
        
        // Call onPreferenceChange() now
        dojo.forEach(
          dojo.query("#ingame_menu_content .preference_control"),
          el => onchange({ target: el })
        );
    }
      
    private onPreferenceChange(prefId: number, prefValue: number) {
        switch (prefId) {
            /*case 201: // if we reactivate this option, we need to reset commit "new design for counters" for the case 2 (only)
                document.getElementsByTagName('html')[0].dataset.easyread = (prefValue == 1).toString();
                break;*/
            case 202: 
                if (!this.isReadOnly()) {
                    this.setAskConfirm(prefValue != 2);
                }
                break;
        }
    }

    private isReadOnly() {
        return (this as any).isSpectator || typeof g_replayFrom != 'undefined' || g_archive_mode;
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
                <div>${playerId == gamedatas.firstPlayerId ? `<div id="first-player">${_('First player')}</div>` : ''}</div>
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

    private getColorAddHtml() {
        return [1, 2, 3, 4, 5].map((number, index) => `<div class="color-icon" data-row="${index}"></div><span class="label"> ${this.cardsManager.getColor(number)}</span>`).join('');
    }

    private getHelpHtml() {
        let html = `
        <div id="help-popin">
            <h1>${_("Tribe cards")}</h1>
            <h2>${_("Immediate effect")}</h2>
            <div class="row">
                <div class="help-icon card"></div>
                <div class="help-label">${this.cardsManager.getPower(10)}</div>

                <div class="help-icon token"></div>
                <div class="help-label">${this.cardsManager.getPower(11)}</div>
            </div>    

            <h2>${_("Points earned")}</h2>            
            <div class="row">
                <div class="help-icon score by-color"></div>
                <div class="help-label">${_("X point s for each card of the indicated color in the player’s tribe.")}</div>
                
                <div class="help-icon score different"></div>
                <div class="help-label">${_("X points for each different kind of resource (berry, meat, flint, skin) placed on this card. Bones can replace 1 of these 4 resources.")}</div>

                <div class="help-icon score by-resource"></div>
                <div class="help-label">${_("X points for each resource on this card.")}</div>
                
                <div class="help-icon score by-type"></div>
                <div class="help-label">${_("X points for each card of the indicated type in the player’s tribe.")}</div>
            </div>  

            <h1>${_("Powers of the chieftains")}</h1>
            <div class="row help-chief">
                <div class="help-icon" data-power="2"></div>
                <div class="help-label">${this.chiefsManager.getPower(2)}</div>

                <div class="help-icon" data-power="3"></div>
                <div class="help-label">${this.chiefsManager.getPower(3)}</div>

                <div class="help-icon" data-power="4"></div>
                <div class="help-label">${this.chiefsManager.getPower(4)}</div>

                <div class="help-icon" data-power="1"></div>
                <div class="help-label">${this.chiefsManager.getPower(1)}</div>
            </div>  
        </div>
        `;
        
        return html;
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
  	
    public confirm() {
        if(!(this as any).checkAction('confirm')) {
            return;
        }

        this.takeAction('confirm');
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
  	
    public endTurn() {
        if(!(this as any).checkAction('endTurn')) {
            return;
        }

        this.takeAction('endTurn');
    }
  	
    public discardCard(id: number) {
        if(!(this as any).checkAction('discardCard')) {
            return;
        }

        this.takeAction('discardCard', {
            id
        });
    }
  	
    public chooseOneLess(type: number) {
        if(!(this as any).checkAction('chooseOneLess')) {
            return;
        }

        this.takeAction('chooseOneLess', {
            type
        });
    }    
  	
    public cancel() {
        if(!(this as any).checkAction('cancel')) {
            return;
        }

        this.takeAction('cancel');
    }
  	
    public storeToken(cardId: number, tokenType: number) {
        if(!(this as any).checkAction('storeToken')) {
            return;
        }

        this.takeAction('storeToken', {
            cardId, 
            tokenType,
        });
    }
  	
    public unstoreToken(tokenId: number) {
        if(!(this as any).checkAction('unstoreToken')) {
            return;
        }

        this.takeAction('unstoreToken', {
            tokenId,
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
  	
    public cancelLastMoves() {
        /*if(!(this as any).checkAction('cancelLastMoves')) {
            return;
        }*/

        this.takeAction('cancelLastMoves');
    }

    public setAskConfirm(askConfirm: boolean) {
        this.takeNoLockAction('setAskConfirm', {
            askConfirm
        });
    }

    public takeAction(action: string, data?: any) {
        data = data || {};
        data.lock = true;
        (this as any).ajaxcall(`/elawa/elawa/${action}.html`, data, this, () => {});
    }
    public takeNoLockAction(action: string, data?: any) {
        data = data || {};
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
            ['storedToken', ANIMATION_MS],
            ['unstoredToken', ANIMATION_MS],
            ['confirmStoredTokens', ANIMATION_MS],
            ['discardTokens', 1],
            ['refillTokens', 1],
            ['updateScore', 1],
            ['cancelLastMoves', ANIMATION_MS],
            ['lastTurn', 1],
            ['cardScores', ANIMATION_MS],
        ];
    
        notifs.forEach((notif) => {
            dojo.subscribe(notif[0], this, `notif_${notif[0]}`);
            (this as any).notifqueue.setSynchronous(notif[0], notif[1]);
        });
    }

    notif_takeCard(notif: Notif<NotifTakeCardArgs>) {
        const playerId = notif.args.playerId;
        const currentPlayer = this.getPlayerId() == playerId;
        const playerTable = this.getPlayerTable(playerId);
        (currentPlayer ? playerTable.hand : playerTable.voidStock).addCard(notif.args.card);
        this.tableCenter.setNewCard(notif.args.pile, notif.args.newCard, notif.args.newCount);
        this.handCounters[playerId].toValue(notif.args.handCount);
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

    notif_storedToken(notif: Notif<NotifStoredTokenArgs>) {
        const playerId = notif.args.playerId;
        const token = notif.args.token;
        this.getPlayerTable(playerId).storeToken(notif.args.cardId, token);
        this.resourcesCounters[playerId][token.type].incValue(-1);
    }

    notif_unstoredToken(notif: Notif<NotifUnstoredTokenArgs>) {
        const playerId = notif.args.playerId;
        const token = notif.args.token;
        this.getPlayerTable(playerId).unstoreToken(token);
        this.resourcesCounters[playerId][token.type].incValue(+1);
    }

    notif_confirmStoredTokens(notif: Notif<NotifConfirmStoredTokensArgs>) {
        const playerId = notif.args.playerId;
        this.getPlayerTable(playerId).confirmStoreTokens(notif.args.tokens);
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

    notif_cancelLastMoves(notif: Notif<NotifCancelLastMovesArgs>) {
        const playerId = notif.args.playerId;
        this.getPlayerTable(playerId).cancelLastMoves(notif.args.cards, notif.args.tokens);
        [1,2,3,4,5].forEach(type => 
            this.resourcesCounters[playerId][type].toValue(notif.args.tokens.filter(token => token.type == type).length)
        );
    }

    notif_cardScores(notif: Notif<NotifCardScoresArgs>) {
        Object.entries(notif.args.cardScores).forEach(entry => this.cardsManager.setCardScore(Number(entry[0]), entry[1]));
    }
    
    /** 
     * Show last turn banner.
     */ 
    notif_lastTurn(animate: boolean = true) {
        dojo.place(`<div id="last-round">
            <span class="last-round-text ${animate ? 'animate' : ''}">${_("This is the final round!")}</span>
        </div>`, 'page-title');
    }

    /* This enable to inject translatable styled things to logs or action bar */
    /* @Override */
    public format_string_recursive(log: string, args: any) {
        try {
            if (log && args && !args.processed) {

                if (args.card_display && (typeof args.card_display !== 'string' || args.card_display[0] !== '<')) {
                    const cardIndex = Number(args.card_display);
                    const color = Math.floor(cardIndex / 100);
                    const number = cardIndex % 100;
                    args.card_display = `
                    <div class="card elawa-card">
                        <div class="card-sides">
                            <div class="card-side front" data-color="${color}" data-number="${number}"></div>
                        </div>
                    </div>
                    `;
                }

                if (args.type && (typeof args.type !== 'string' || args.type[0] !== '<')) {
                    args.type = `<div class="token-icon" data-type="${args.type}"></div>`;
                }

                if (args.types && (typeof args.types !== 'string' || args.types[0] !== '<')) {
                    args.types = args.types.map(type => `<div class="token-icon" data-type="${type}"></div>`).join('');
                }

                for (const property in args) {
                    if (['left', 'card_color', 'card_type'].includes(property) && args[property][0] != '<') {
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