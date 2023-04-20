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

        $endGame = false;
        if (boolval($this->getGameStateValue(LAST_TURN)) && $this->getPlayer($playerId)->chief == intval($this->getUniqueValueFromDB("SELECT min(player_chief) FROM player"))) {
            $endGame = true;
        }

        $this->gamestate->nextState($endGame ? 'endScore' : 'nextPlayer');
    }

    function stEndScore() {
        $playersIds = $this->getPlayersIds();

        foreach($playersIds as $playerId) {
            $playedCards = $this->getCardsByLocation('played'.$playerId);
            $score = 0;
            foreach ($playedCards as $card) {
                $score += $this->getCardScore($card, $playedCards);
            }

            $scoreAux = count($this->getTokensByLocation('player', $playerId));
            $this->DbQuery("UPDATE player SET player_score = $score, player_score_aux = $scoreAux WHERE player_id = $playerId");
        }

        $this->gamestate->nextState('endGame');
    }
}
