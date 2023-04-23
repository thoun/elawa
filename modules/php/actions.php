<?php

trait ActionTrait {

    //////////////////////////////////////////////////////////////////////////////
    //////////// Player actions
    //////////// 
    
    /*
        Each time a player is doing some game action, one of the methods below is called.
        (note: each method below must match an input method in nicodemus.action.php)
    */

    private function refillTokenPile(int $pile, int $playerId) {
        if (intval($this->tokens->countCardInLocation('center')) > 0) {
            $token = $this->getTokenFromDb($this->tokens->pickCardForLocation('center', 'player', $playerId));
            $newCount = intval($this->tokens->countCardInLocation('center'));

            self::notifyAllPlayers('takeToken', clienttranslate('${player_name} takes resource ${type} from center table (pile ${emptyPile} was empty). There is ${left} resources remaining on the fire !'), [
                'playerId' => $playerId,
                'player_name' => $this->getPlayerName($playerId),
                'emptyPile' => $pile, // for logs
                'left' => $newCount, // for logs
                'token' => $token,
                'pile' => -1,
                'newToken' => Token::onlyId($this->getTokenFromDb($this->tokens->getCardOnTop('center'))),
                'newCount' => $newCount,
                'type' => $token->type,
            ]);

            $this->incStat(1, 'collectedResources');
            $this->incStat(1, 'collectedResources', $playerId);
            $this->incStat(1, 'collectedResourcesFromFire');
            $this->incStat(1, 'collectedResourcesFromFire', $playerId);
            $this->incStat(1, 'collectedResources'.$token->type);
            $this->incStat(1, 'collectedResources'.$token->type, $playerId);


            if ($newCount == 0) {
                $this->setGameStateValue(LAST_TURN, 1);

                self::notifyAllPlayers('lastTurn', clienttranslate('${player_name} took the last token on the fire, triggering the end of the game !'), [
                    'playerId' => $playerId,
                    'player_name' => $this->getPlayerName($playerId),
                ]);
            }
        }
        
        $this->tokens->pickCardsForLocation(5, 'deck', 'pile'.$pile);
        $this->tokens->shuffle('pile'.$pile); // to give them a locationArg asc

        self::notifyAllPlayers('refillTokens', clienttranslate('Pile ${emptyPile} is refilled'), [
            'emptyPile' => $pile, // for logs
            'pile' => $pile,
            'newToken' => $this->getTokenFromDb($this->tokens->getCardOnTop('pile'.$pile)),
            'newCount' => intval($this->tokens->countCardInLocation('pile'.$pile)),
        ]);
        
        return $token;
    }

    public function takeCard(int $pile) {
        self::checkAction('takeCard');

        $playerId = intval($this->getActivePlayerId());

        if ($pile < 0 || $pile > 5) {
            throw new BgaUserException("Invalid pile");
        }

        $card = $this->getCardFromDb($this->cards->pickCardForLocation('pile'.$pile, 'hand', $playerId));
        $fromCardPower = intval($this->gamestate->state_id()) == ST_PLAYER_TAKE_CARD_POWER;
        $fromChieftainPower = intval($this->gamestate->state_id()) == ST_PLAYER_TAKE_CARD_CHIEF_POWER;
        $canSkipResource = !$fromCardPower && $this->getChiefPower($playerId) == CHIEF_POWER_SKIP_RESOURCE;

        $message = $fromCardPower || $fromChieftainPower ?
            clienttranslate('${player_name} takes a card with special power') :
            clienttranslate('${player_name} takes a card associated with ${number} tokens');

        self::notifyAllPlayers('takeCard', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'number' => $card->tokens, // for logs
            'card' => $card,
            'pile' => $pile,
            'newCard' => $this->getCardFromDb($this->cards->getCardOnTop('pile'.$pile)),
            'newCount' => intval($this->cards->countCardInLocation('pile'.$pile)),
        ]);

        $redirect = false;
        if (!$fromCardPower && !$canSkipResource) {
            if ($fromChieftainPower) {
                $emptyPileTakeCard = $this->getGlobalVariable('emptyPileTakeCard');
                $fromPile = $emptyPileTakeCard[0];
                $tokens = $emptyPileTakeCard[1];
                $this->applyTakeCardResources($playerId, $fromPile, $tokens);
                $this->deleteGlobalVariable('emptyPileTakeCard');
            } else {
                $redirect = $this->applyTakeCardResources($playerId, $pile, $card->tokens);
            }
        }

        if ($canSkipResource) {
            $this->setGlobalVariable('skipResource', [$pile, $card->tokens]);
            $this->gamestate->nextState('skipResource');
        } else {
            $this->gamestate->nextState($redirect ? 'takeCard' : 'next');
        }
    }
    
    function applyTakeCardResources(int $playerId, int $pile, int $tokens, int $skip = 0) {  // return $redirect
        for ($i = 1; $i <= $tokens + ($skip == 0 ? 0 : 1); $i++) {
            if ($i == $skip) {
                continue;
            }

            $tokenPile = ($pile + $i) % 6;
            $token = $this->getTokenFromDb($this->tokens->pickCardForLocation('pile'.$tokenPile, 'player', $playerId));

            self::notifyAllPlayers('takeToken', clienttranslate('${player_name} takes resource ${type}'), [
                'playerId' => $playerId,
                'player_name' => $this->getPlayerName($playerId),
                'token' => $token,
                'pile' => $tokenPile,
                'newToken' => $this->getTokenFromDb($this->tokens->getCardOnTop('pile'.$tokenPile)),
                'newCount' => intval($this->tokens->countCardInLocation('pile'.$tokenPile)),
                'type' => $token->type,
            ]);

            $this->incStat(1, 'collectedResources');
            $this->incStat(1, 'collectedResources', $playerId);
            $this->incStat(1, 'collectedResources'.$token->type);
            $this->incStat(1, 'collectedResources'.$token->type, $playerId);

            if (intval($this->tokens->countCardInLocation('pile'.$tokenPile)) == 0) {
                $this->refillTokenPile($tokenPile, $playerId);
                
                if ($this->getChiefPower($playerId) == CHIEF_POWER_TAKE_CARD) {
                    $this->setGlobalVariable('emptyPileTakeCard', [$tokenPile, $tokens - $i]);
                    return true;
                }
            }
        }

        if ($tokens == 1 && $this->getChiefPower($playerId) == CHIEF_POWER_ADDITIONAL_RESOURCE) {
            $this->takeRessourceFromPool($playerId);
        }

        return false;
    }

    function skipResource(int $number) {
        self::checkAction('skipResource');

        $playerId = intval($this->getActivePlayerId());
        
        $skipResourceArray = $this->getGlobalVariable('skipResource', true);
        $pile = $skipResourceArray[0];
        $tokens = $skipResourceArray[1];

        $this->applyTakeCardResources($playerId, $pile, $tokens, $number); // will always return false as player can't have both powers
        $this->deleteGlobalVariable('skipResource');

        $this->gamestate->nextState('next');
    }

    function applyPlayCard(int $playerId, Card $card) {
        $this->cards->moveCard($card->id, 'played'.$playerId, intval($this->cards->countCardInLocation('played'.$playerId)) - 1);

        $payOneLess = null;
        if ($this->getChiefPower($playerId) == CHIEF_POWER_PAY_ONE_LESS_RESOURCE) {
            $payOneLess = $this->getGlobalVariable('payOneLess', true) ?? [0, 0, 0]; // played card, selected card id, chosen
        }

        $resources = $this->getPlayerResources($playerId);
        $tokens = $this->tokensToPayForCard($card, $resources);

        if ($payOneLess !== null && $payOneLess[0] == 1 && $payOneLess[2] > 0) {
            $indexOfIgnored = $this->array_findIndex($tokens, fn($token) => $token->id == $payOneLess[2]);
            array_splice($tokens, $indexOfIgnored, 1);
        }

        $this->tokens->moveCards(array_map(fn($token) => $token->id, $tokens), 'discard');
        
        self::notifyAllPlayers('playCard', clienttranslate('${player_name} plays a card from their hand'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'card' => $card,
            'newCount' => intval($this->cards->countCardInLocation('hand', $playerId)),
            'discardedTokens' => $tokens,
        ]);

        $this->updateScore($playerId);

        if ($card->power == POWER_RESSOURCE) {
            $this->takeRessourceFromPool($playerId);
        }

        if ($payOneLess !== null) {
            $payOneLess[0]++;
            $this->setGlobalVariable('payOneLess', $payOneLess);
        }

        $this->incStat(1, 'playedCards');
        $this->incStat(1, 'playedCards', $playerId);
        $this->incStat(1, 'playedCards'.$card->cardType);
        $this->incStat(1, 'playedCards'.$card->cardType, $playerId);

        $this->gamestate->nextState($card->power == POWER_CARD ? 'takeCardPower' : 'stay');
    }

    public function playCard(int $id) {
        self::checkAction('playCard');

        $playerId = intval($this->getActivePlayerId());

        $args = $this->argPlayCard();
        $card = $this->array_find($args['playableCards'], fn($c) => $c->id == $id);

        if ($card == null || $card->location != 'hand' || $card->locationArg != $playerId) {
            throw new BgaUserException("You can't play this card");
        }

        if ($args['payOneLess'] && ($card->discard || count($card->resources) > 0)) { // ignore a card you can't pay one less (no required resource at all)
            $payOneLess = $this->getGlobalVariable('payOneLess', true);
            $payOneLess[1] = $id;
            $this->setGlobalVariable('payOneLess', $payOneLess);
            $this->gamestate->nextState('chooseOneLessResource');
        } else if ($card->discard) {
            $this->setGameStateValue(SELECTED_CARD, $id);
            $this->gamestate->nextState('discard');
            return;
        } else {
            $this->applyPlayCard($playerId, $card);
        }        
    }

    public function pass() {
        self::checkAction('pass');

        $playerId = intval($this->getActivePlayerId());

        if ($this->getChiefPower($playerId) == CHIEF_POWER_PAY_ONE_LESS_RESOURCE) {
            $this->deleteGlobalVariable('payOneLess');
        }

        $this->gamestate->nextState('next');
    }

    public function discardCard(int $id) {
        self::checkAction('discardCard');

        $playerId = intval($this->getActivePlayerId());

        $args = $this->argDiscardCard();
        $card = $this->array_find($args['playableCards'], fn($c) => $c->id == $id);

        if ($card == null || $card->location != 'hand' || $card->locationArg != $playerId) {
            throw new BgaUserException("You can't play this card");
        }

        $this->cards->moveCard($card->id, 'discard', $playerId);

        self::notifyPlayer($playerId, 'discardCard', '', [
            'playerId' => $playerId,
            'card' => $card,
        ]);
        
        $this->incStat(1, 'sacrifices');
        $this->incStat(1, 'sacrifices', $playerId);

        $this->applyPlayCard($playerId, $args['selectedCard']);
        $this->setGameStateValue(SELECTED_CARD, -1);
    }

    public function chooseOneLess(int $type) {
        self::checkAction('chooseOneLess');

        $payOneLess = $this->getGlobalVariable('payOneLess', true); // played card, selected card id, chosen
        $payOneLess[2] = $type;
        $this->setGlobalVariable('payOneLess', $payOneLess);
        $card = $this->getCardFromDb($this->cards->getCard($payOneLess[1]));

        if ($card->discard && $type != 0) {
            $this->setGameStateValue(SELECTED_CARD, $card->id);
            $this->gamestate->nextState('discard');
        } else {
            $playerId = intval($this->getActivePlayerId());
            $this->applyPlayCard($playerId, $card);
        }
    }

    public function cancel() {
        self::checkAction('cancel');

        $this->gamestate->nextState('next');
    }

    public function storeTokens(array $tokens) {
        self::checkAction('storeTokens');

        $playerId = intval($this->getActivePlayerId());

        foreach ($tokens as $cardId => $tokenId) {
            $this->tokens->moveCard($tokenId, 'card', $cardId);
        }

        self::notifyAllPlayers('storedTokens', clienttranslate('${player_name} stores ${number} resource(s)'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'number' => count($tokens), // for logs
            'tokens' => $tokens,
        ]);

        $this->gamestate->nextState('next');
    }

    public function keepSelectedTokens(array $ids) {
        self::checkAction('keepSelectedTokens');

        $playerId = intval($this->getActivePlayerId());

        $args = $this->argDiscardTokens();
        if (count($ids) != $args['number']) {
            throw new BgaUserException("Invalid selected resource count");
        }

        $tokens = $this->getTokensByLocation('player', $playerId);
        $keptTokens = array_values(array_filter($tokens, fn($token) => $this->array_some($ids, fn($id) => $token->id == $id)));
        $discardedTokens = array_values(array_filter($tokens, fn($token) => !$this->array_some($ids, fn($id) => $token->id == $id)));

        $this->tokens->moveCards(array_map(fn($token) => $token->id, $discardedTokens), 'discard');

        self::notifyAllPlayers('discardTokens', clienttranslate('${player_name} discards ${number} resource(s)'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'number' => count($discardedTokens), // for logs
            'keptTokens' => $keptTokens,
            'discardedTokens' => $discardedTokens,
        ]);
        
        $this->incStat(count($discardedTokens), 'discardedResourcesEndOfTurn');
        $this->incStat(count($discardedTokens), 'discardedResourcesEndOfTurn', $playerId);

        $this->gamestate->nextState('next');
    }
}
