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

    function askConfirm(int $playerId) {
        return boolval($this->getUniqueValueFromDB("SELECT ask_confirm FROM player WHERE `player_id` = $playerId"));
    }

    function skipResource(int $number) {
        self::checkAction('skipResource');

        $playerId = intval($this->getActivePlayerId());
        
        $skipResourceArray = $this->getGlobalVariable(POWER_SKIP_RESSOURCE, true);
        $skipResourceArray[2] = $number;
        $this->setGlobalVariable(POWER_SKIP_RESSOURCE, $skipResourceArray);

        if ($this->askConfirm($playerId)) {
            $this->gamestate->nextState('confirm');
        } else {
            $this->applyTakeCard($playerId, $skipResourceArray[0]);
            $this->gamestate->nextState('next');
        }
    }

    public function confirm() {
        self::checkAction('takeCard');

        $playerId = intval($this->getActivePlayerId());

        $pile = intval($this->getGameStateValue(SELECTED_PILE));

        $this->applyTakeCard($playerId, $pile);
    }

    public function takeCard(int $pile) {
        self::checkAction('takeCard');

        $playerId = intval($this->getActivePlayerId());

        if ($pile < 0 || $pile > 5) {
            throw new BgaUserException("Invalid pile");
        }

        if (intval($this->cards->countCardInLocation('pile'.$pile)) == 0) {
            throw new BgaUserException("The pile is empty");
        }

        $stateId = intval($this->gamestate->state_id());
        $hasPowerSkipResource = $this->getChiefPower($playerId) == CHIEF_POWER_SKIP_RESOURCE;

        if ($stateId == ST_PLAYER_TAKE_CARD && $hasPowerSkipResource) {
            $this->setGameStateValue(SELECTED_PILE, $pile);
            $card = $this->getCardFromDb($this->cards->getCardOnTop('pile'.$pile));
            $this->setGlobalVariable(POWER_SKIP_RESSOURCE, [$pile, $card->tokens]);
            $this->gamestate->nextState('skipResource');
            return;
        }

        if (in_array($stateId, [ST_PLAYER_TAKE_CARD, ST_PLAYER_CONFIRM_TAKE_CARD]) && $this->askConfirm($playerId)) {
            $this->setGameStateValue(SELECTED_PILE, $pile);
            $this->gamestate->nextState('confirm');
            return;
        }

        $this->applyTakeCard($playerId, $pile);
    }

    public function applyTakeCard(int $playerId, int $pile) {
        $stateId = intval($this->gamestate->state_id());
        $fromCardPower = $stateId == ST_PLAYER_TAKE_CARD_POWER;
        $fromChieftainPower = $stateId == ST_PLAYER_TAKE_CARD_CHIEF_POWER;

        $card = $this->getCardFromDb($this->cards->pickCardForLocation('pile'.$pile, 'hand', $playerId));

        $message = $fromCardPower || $fromChieftainPower ?
            clienttranslate('${player_name} takes a ${card_color} ${card_type} card with special power ${card_display}') :
            clienttranslate('${player_name} takes a ${card_color} ${card_type} card associated with ${number} tokens ${card_display}');

        self::notifyAllPlayers('takeCard', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'number' => $card->tokens, // for logs
            'card' => $card,
            'pile' => $pile,
            'card_type' => $this->getCardType($card->cardType), // for logs
            'card_color' => $this->getCardColor($card->color), // for logs
            'newCard' => $this->getCardFromDb($this->cards->getCardOnTop('pile'.$pile)),
            'newCount' => intval($this->cards->countCardInLocation('pile'.$pile)),
            'card_display' => 100 * $card->color + $card->number, // for logs
            'handCount' => intval($this->cards->countCardInLocation('hand', $playerId)),
        ]);

        $redirect = false;
        if (!$fromCardPower) {
            if ($fromChieftainPower) {
                $emptyPileTakeCards = $this->getGlobalVariable(POWER_EMPTY_PILE) ?? 0;
                $emptyPileTakeCards -= 1;
                if ($emptyPileTakeCards > 0) {
                    $this->setGlobalVariable(POWER_EMPTY_PILE, $emptyPileTakeCards);
                    $redirect = true;
                } else {
                    $this->deleteGlobalVariable(POWER_EMPTY_PILE);
                }
            } else {
                $skip = 0;
                $hasPowerSkipResource = $this->getChiefPower($playerId) == CHIEF_POWER_SKIP_RESOURCE;
                if ($hasPowerSkipResource) {
                    $skip = $this->getGlobalVariable(POWER_SKIP_RESSOURCE, true)[2];
                }
                $redirect = $this->applyTakeCardResources($playerId, $pile, $card->tokens, $skip);
            }
        }
        
        if ($fromCardPower || $fromChieftainPower) {
            $this->saveForUndo($playerId, true);
        }

        $this->gamestate->nextState($redirect ? 'takeCard' : 'next');
    }
    
    function applyTakeCardResources(int $playerId, int $pile, int $tokens, int $skip = 0) {  // return $redirect
        $redirect = false;

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
                    $remainingCardsToTake = $this->getGlobalVariable(POWER_EMPTY_PILE) ?? 0;
                    $this->setGlobalVariable(POWER_EMPTY_PILE, $remainingCardsToTake + 1);
                    $redirect = true;
                }
            }
        }

        if ($tokens == 1 && $this->getChiefPower($playerId) == CHIEF_POWER_ADDITIONAL_RESOURCE) {
            $this->takeRessourceFromPool($playerId);
        }

        return $redirect;
    }

    function applyPlayCard(int $playerId, Card $card) {
        $this->cards->moveCard($card->id, 'played'.$playerId, intval($this->cards->countCardInLocation('played'.$playerId)) - 1);

        $this->incGameStateValue(CANCELLABLE_MOVES, 1);

        $payOneLessData = null;
        $payOneLess = false;
        if ($this->getChiefPower($playerId) == CHIEF_POWER_PAY_ONE_LESS_RESOURCE) {
            $payOneLessData = $this->getGlobalVariable(POWER_PAY_ONE_LESS, true) ?? [0, 0, 0]; // played card, selected card id, chosen
            $payOneLess = $payOneLessData !== null && $payOneLessData[0] == 1 && $payOneLessData[2] > 0;
        }

        $resources = $this->getPlayerResources($playerId);
        $tokens = $this->tokensToPayForCard($card, $resources, null, false, $payOneLess ? $payOneLessData[2] : null);
        if ($tokens === null) {
            throw new BgaUserException("You can't play this card (not enough tokens)");
        }

        $this->tokens->moveCards(array_map(fn($token) => $token->id, $tokens), 'discard');
        $message = count($tokens) > 0 ?
            clienttranslate('${player_name} plays a ${card_color} ${card_type} card from their hand (paid ${types}) ${card_display}') :
            clienttranslate('${player_name} plays a ${card_color} ${card_type} card from their hand ${card_display}');
        
        self::notifyAllPlayers('playCard', $message, [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'card' => $card,
            'newCount' => intval($this->cards->countCardInLocation('hand', $playerId)),
            'discardedTokens' => $tokens,
            'types' => array_map(fn($token) => $token->type, $tokens), // for logs
            'card_type' => $this->getCardType($card->cardType), // for logs
            'card_color' => $this->getCardColor($card->color), // for logs
            'card_display' => 100 * $card->color + $card->number, // for logs
        ]);

        $this->updateScore($playerId);

        if ($card->power == POWER_RESSOURCE) {
            $this->takeRessourceFromPool($playerId);
            $this->saveForUndo($playerId, true);
        }

        if ($payOneLessData !== null) {
            $payOneLessData[0]++;
            $this->setGlobalVariable(POWER_PAY_ONE_LESS, $payOneLessData);
        }

        $this->incStat(1, 'playedCards');
        $this->incStat(1, 'playedCards', $playerId);
        $this->incStat(1, 'playedCards'.$card->cardType);
        $this->incStat(1, 'playedCards'.$card->cardType, $playerId);

        $this->gamestate->nextState($card->power == POWER_CARD ? 'takeCardPower' : 'next');
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
            $payOneLess = $this->getGlobalVariable(POWER_PAY_ONE_LESS, true);
            $payOneLess[1] = $id;
            $this->setGlobalVariable(POWER_PAY_ONE_LESS, $payOneLess);
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

        //$playerId = intval($this->getActivePlayerId());

        $this->gamestate->nextState('next');
    }

    public function endTurn() {
        self::checkAction('endTurn');
        $playerId = intval($this->getActivePlayerId());

        $this->confirmStoreTokens($playerId);

        $this->incGameStateValue(CANCELLABLE_MOVES, 1);

        $args = $this->argDiscardTokens();
        $max = $args['number'];
        $tokens = $this->getTokensByLocation('player', $playerId);

        $discard = true;
        if (count($tokens) <= $max) {
            self::notifyAllPlayers('discardTokens', '', [
                'playerId' => $playerId,
                'keptTokens' => $tokens,
                'discardedTokens' => [],
            ]);

            $discard = false;
        }

        $this->gamestate->nextState($discard ? 'endTurnDiscard' : 'endTurn');
    }

    public function discardCard(int $id) {
        self::checkAction('discardCard');

        $playerId = intval($this->getActivePlayerId());

        $args = $this->argDiscardCard();
        $card = $this->array_find($args['playableCards'], fn($c) => $c->id == $id);

        if ($card == null || $card->location != 'hand' || $card->locationArg != $playerId) {
            throw new BgaUserException("You can't discard this card");
        }

        $this->cards->moveCard($card->id, 'discard', $playerId);

        $this->incGameStateValue(CANCELLABLE_MOVES, 1);

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

        $payOneLess = $this->getGlobalVariable(POWER_PAY_ONE_LESS, true); // played card, selected card id, chosen
        $payOneLess[2] = $type;
        $this->setGlobalVariable(POWER_PAY_ONE_LESS, $payOneLess);
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

        $stateId = intval($this->gamestate->state_id());

        $this->gamestate->nextState(in_array($stateId, [ST_PLAYER_CONFIRM_TAKE_CARD, ST_PLAYER_SKIP_RESOURCE]) ? 'cancel' : 'next');
    }

    public function storeToken(int $cardId, int $tokenType) {
        self::checkAction('storeToken');

        $playerId = intval($this->getActivePlayerId());
        $playerTokens = $this->getTokensByLocation('player', $playerId);
        $token = $this->array_find($playerTokens, fn($playerToken) => $playerToken->type == $tokenType);
        $card = $this->getCardFromDb($this->cards->getCard($cardId));        

        if ($token == null || $card == null || $card->location != 'played'.$playerId) {
            throw new BgaUserException("Invalid action");
        }

        if ($card->storageType == DIFFERENT) {
            $storedResources = $this->getTokensByLocation('card', $card->id);
            if ($this->array_some($storedResources, fn($resource) => $resource->type == $tokenType)) {
                throw new BgaUserException("You cannot store twice the same resource");
            }
            if (count($storedResources) == 4) {
                throw new BgaUserException("You can only store 4 resources on this card (one of each)");
            }
        }

        $this->tokens->moveCard($token->id, 'prestore', $cardId);

        $this->incGameStateValue(CANCELLABLE_MOVES, 1);

        self::notifyAllPlayers('storedToken', clienttranslate('${player_name} stores ${type} on a storage card'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'type' => $token->type, // for logs
            'token' => $token,
            'cardId' => $cardId,
        ]);

        $this->updateScore($playerId);

        $this->gamestate->nextState('stay');
    }

    public function unstoreToken(int $tokenId) {
        self::checkAction('unstoreToken');

        $playerId = intval($this->getActivePlayerId());
        $token = $this->getTokenFromDb($this->tokens->getCard($tokenId));

        if ($token->location != 'prestore') {
            throw new BgaUserException("Invalid action");
        }

        $this->tokens->moveCard($tokenId, 'player', $playerId);

        $this->incGameStateValue(CANCELLABLE_MOVES, 1);

        self::notifyAllPlayers('unstoredToken', clienttranslate('${player_name} removes ${type} from a storage card'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'type' => $token->type, // for logs
            'token' => $token,
        ]);

        $this->updateScore($playerId);

        $this->gamestate->nextState('stay');
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

        self::notifyAllPlayers('discardTokens', clienttranslate('${player_name} discards ${types}'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'number' => count($discardedTokens), // for logs
            'keptTokens' => $keptTokens,
            'discardedTokens' => $discardedTokens,
            'types' => array_map(fn($token) => $token->type, $discardedTokens), // for logs
        ]);
        
        $this->incStat(count($discardedTokens), 'discardedResourcesEndOfTurn');
        $this->incStat(count($discardedTokens), 'discardedResourcesEndOfTurn', $playerId);

        $this->gamestate->nextState('next');
    }

    public function cancelLastMoves() {
        //self::checkAction('cancelLastMoves');

        $playerId = intval($this->getActivePlayerId());
        $undo = $this->getGlobalVariable(UNDO);

        $this->cards->moveCards($undo->cardsIds, 'hand', $playerId);
        $this->tokens->moveCards($undo->tokensIds, 'player', $playerId);

        $this->setGameStateValue(CANCELLABLE_MOVES, 0);

        $this->setGlobalVariable(POWER_PAY_ONE_LESS, $undo->payOneLess);

        self::notifyAllPlayers('cancelLastMoves', clienttranslate('${player_name} cancels their last moves'), [
            'playerId' => $playerId,
            'player_name' => $this->getPlayerName($playerId),
            'cards' => $this->getCardsFromDb($this->cards->getCards($undo->cardsIds)),
            'tokens' => $this->getTokensFromDb($this->tokens->getCards($undo->tokensIds)),
        ]);

        $this->updateScore($playerId);

        $this->gamestate->jumpToState(ST_PLAYER_PLAY_CARD);
    }

    function setAskConfirm(bool $askConfirm) {
        $playerId = intval($this->getCurrentPlayerId());

        $this->DbQuery("UPDATE `player` SET `ask_confirm` = ".($askConfirm ? 1 : 0)." WHERE `player_id` = $playerId");
        
        // dummy notif so player gets back hand
        $this->notifyPlayer($playerId, "setAskConfirm", '', []);
    }
}
