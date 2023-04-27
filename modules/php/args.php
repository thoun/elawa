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
            //'available' => [1,2,3,4,5,6],
        ];
    }

    function argSkipResource() {
        $skipResourceArray = $this->getGlobalVariable(POWER_SKIP_RESSOURCE, true);
        $pile = $skipResourceArray[0];
        $tokens = $skipResourceArray[1];

        $resources = [];
        for ($i = 1; $i <= $tokens + 1; $i++) {
            $tokenPile = ($pile + $i) % 6;
            $resources[] = $this->getTokenFromDb($this->tokens->getCardOnTop('pile'.$tokenPile))->type;
        }

        return [
            'pile' => $pile,
            'resources' => $resources,
        ];
    }
   
    function argPlayCard() {
        $playerId = intval($this->getActivePlayerId());

        $hand = $this->getCardsByLocation('hand', $playerId);
        $resources = $this->getPlayerResources($playerId);

        $payOneLess = false;
        if ($this->getChiefPower($playerId) == CHIEF_POWER_PAY_ONE_LESS_RESOURCE) {
            $payOneLessVar = $this->getGlobalVariable(POWER_PAY_ONE_LESS, true) ?? [0, 0, 0]; // played card, selected card id, chosen
            $payOneLess = $payOneLessVar[0] == 1;
        }

        $playableCards = array_values(array_filter($hand, fn($card) => $this->tokensToPayForCard($card, $resources, $hand, $payOneLess) !== null));

        return [
            'payOneLess' => $payOneLess,
            'playableCards' => $playableCards,
        ];
    }

    function argChooseOneLess() {
        //$playerId = intval($this->getActivePlayerId());

        $payOneLess = $this->getGlobalVariable(POWER_PAY_ONE_LESS, true); // played card, selected card id, chosen
        $card = $this->getCardFromDb($this->cards->getCard($payOneLess[1]));

        //$resources = $this->getPlayerResources($playerId);
        $tokens = array_unique($card->resources);

        return [
            'canSkipDiscard' => $card->discard,
            'tokens' => $tokens,
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

        $played = $this->getPlayedCardWithStoredResources($playerId);
        $storageCards = array_values(array_filter($played, fn($card) => $card->cardType == STORAGE));
        $resources = $this->getPlayerResources($playerId);
        foreach ($storageCards as &$card) {
            if ($card->storageType == DIFFERENT) {
                $groupedStoredResource = [                    
                    BERRY => [],
                    MEAT => [],
                    FLINT => [],
                    SKIN => [],
                    BONE => [],
                ];
                foreach ($card->storedResources as $storedResource) {
                    $groupedStoredResource[$storedResource->type][] = $storedResource;
                }
                $availableResources = [];
                foreach ($resources as $type => $resourceArray) {
                    if (count($resourceArray) > 0) {
                        $availableResources[] = $type;
                    }
                }
                $card->canStoreResourceType = $this->array_some($availableResources, fn($availableResource) =>
                    count($groupedStoredResource[$availableResource]) == 0
                );
            } else {
                $card->canStoreResourceType = count($resources[$card->storageType]) > 0;
            }
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
