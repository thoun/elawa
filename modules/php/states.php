<?php

trait StateTrait {

//////////////////////////////////////////////////////////////////////////////
//////////// Game state actions
////////////

    /*
        Here, you can create methods defined as "game state actions" (see "action" property in states.inc.php).
        The action method of state X is called everytime the current game state is set to X.
    */

    function stPlayCard() {
        $playerId = intval($this->getActivePlayerId());

        if (count($this->getCardsByLocation('hand', $playerId)) == 0) {
            $this->gamestate->nextState('next');
        }
    }

    function stStoreToken() {
        $playerId = intval($this->getActivePlayerId());

        $played = $this->getCardsByLocation('played'.$playerId);
        $storageCards = array_values(array_filter($played, fn($card) => $card->cardType == STORAGE));

        if (count($storageCards) == 0) {
            $this->gamestate->nextState('next');
        }
    }

    function stNextPlayer() {     
        $playerId = $this->getActivePlayerId();

        //$this->incStat(1, 'turnsNumber');
        //$this->incStat(1, 'turnsNumber', $playerId);

        $this->activeNextPlayer();       
        $playerId = $this->getActivePlayerId();

        $this->giveExtraTime($playerId);

        $this->gamestate->nextState('nextPlayer');
    }

    function stEndScore() {
        $this->gamestate->nextState('endGame');
    }
}
