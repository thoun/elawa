<?php

trait ArgsTrait {
    
//////////////////////////////////////////////////////////////////////////////
//////////// Game state arguments
////////////

    /*
        Here, you can create methods defined as "game state arguments" (see "args" property in states.inc.php).
        These methods function is to return some additional information that is specific to the current
        game state.
    */
   
    function argTakeCard() {
        $playerId = intval($this->getActivePlayerId());

        return [
            'playerId' => $playerId,
            'available' => [1,2,3,4,5,6], // TODO
        ];
    }
   
    function argPlayCard() {
        $playerId = intval($this->getActivePlayerId());

        $hand = $this->getCardsByLocation('hand', $playerId);
        $resources = $this->getPlayerResources($playerId);
        $playableCards = array_values(array_filter($hand, fn($card) => $this->tokensToPayForCard($card, $resources, $hand) !== null));

        return [
            'playableCards' => $playableCards,
        ];
    }

    function argDiscardCard() {
        $playerId = intval($this->getActivePlayerId());

        $hand = $this->getCardsByLocation('hand', $playerId);
        $selectedCard = $this->getCardFromDb($this->cards->getCard(intval($this->getGameStateValue(SELECTED_CARD))));
        $playableCards = array_values(array_filter($hand, fn($card) => $card->id != $selectedCard->id));

        return [
            'selectedCard' => $selectedCard,
            'playableCards' => $playableCards,
        ];
    }
   
    function argStoreTokens() {
        $playerId = intval($this->getActivePlayerId());

        $played = $this->getCardsByLocation('played'.$playerId);
        $storageCards = array_values(array_filter($played, fn($card) => $card->cardType == STORAGE));
        $resources = $this->getPlayerResources($playerId);
        foreach ($storageCards as &$card) {
            $card->canStoreResourceType = count($resources[$card->storageType]) > 0;
        }

        return [
            'storageCards' => $storageCards,
            'canPlaceBone' => count($resources[BONE]) > 0,
        ];
    }

    function argDiscardTokens() {
        $number = $this->getMaxKeepResources();

        return [
            'number' => $number,
        ];
    }
} 
