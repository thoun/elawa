<?php

trait ActionTrait {

    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    //////////// 
    
    /*
        Each time a player is doing some game action, one of the methods below is called.
        (note: each method below must match an input method in nicodemus.action.php)
    */

    

    public function takeCard(int $pile) {
        self::checkAction('takeCard');

        $playerId = intval($this->getCurrentPlayerId());

        if ($pile < 0 || $pile > 5) {
            throw new BgaUserException("Invalid pile");
        }

        $card = $this->getCardFromDb($this->cards->pickCardForLocation('pile'.$pile, 'hand', $playerId));

        if ($this->getPlayerSelectedCard($playerId) !== null) {
            $this->setPlayerSelectedCard($playerId, null);
        }

        $this->setPlayerSelectedCard($playerId, $id);

        $this->gamestate->nextState('next');
    }
}
