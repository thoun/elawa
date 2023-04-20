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

        $playerId = intval($this->getActivePlayerId());

        if ($pile < 0 || $pile > 5) {
            throw new BgaUserException("Invalid pile");
        }

        $card = $this->getCardFromDb($this->cards->pickCardForLocation('pile'.$pile, 'hand', $playerId));

        $tokens = [];
        for ($i = 1; $i <= $card->tokens; $i++) {
            $tokenPile = ($pile + $i) % 6;
            $tokens[] = $this->getTokenFromDb($this->tokens->pickCardForLocation('pile'.$tokenPile, 'hand', $playerId));
            if (intval($this->tokens->countCardInLocation('pile'.$tokenPile)) == 0) {
                /* TODO take takes 1 additional resource from the central pile. Then a new
pile is formed to replace the finished pile using 5 resource tokens
taken randomly from the resource pool.*/
            }
        }

        // TODO notif

        $this->gamestate->nextState('next');
    }

    public function playCard(int $id) {
        self::checkAction('playCard');

        $playerId = intval($this->getActivePlayerId());

        $card = $this->getCardFromDb($this->cards->getCard($id));
        if ($card == null || $card->location != 'hand' || $card->locationArg != $playerId) {
            throw new BgaUserException("You can't play this card");
        }
        // TODO check can pay

        $this->cards->moveCard($card->id, 'played'.$playerId, intval($this->cards->countCardInLocation('played'.$playerId)) - 1);

        // TODO pay
        
        // TODO notif

        $this->gamestate->nextState('next');
    }
}
