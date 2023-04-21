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
            'newCount' => $newCount,
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
        $fromPower = intval($this->gamestate->state_id()) == ST_PLAYER_TAKE_CARD_POWER;

        $message = $fromPower ?
            clienttranslate('${player_name} takes a card with played card power') :
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

        if (!$fromPower) {
            for ($i = 1; $i <= $card->tokens; $i++) {
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

                if (intval($this->tokens->countCardInLocation('pile'.$tokenPile)) == 0) {
                    $this->refillTokenPile($tokenPile, $playerId);
                }
            }
        }

        $this->gamestate->nextState('next');
    }

    function applyPlayCard(int $playerId, Card $card) {
        $this->cards->moveCard($card->id, 'played'.$playerId, intval($this->cards->countCardInLocation('played'.$playerId)) - 1);

        $resources = $this->getPlayerResources($playerId);
        $tokens = $this->tokensToPayForCard($card, $resources);
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
            $token = $this->getTokenFromDb($this->tokens->pickCardForLocation('deck', 'player', $playerId));

            if ($token !== null) {
                self::notifyAllPlayers('takeToken', clienttranslate('${player_name} takes resource ${type}'), [
                    'playerId' => $playerId,
                    'player_name' => $this->getPlayerName($playerId),
                    'token' => $token,
                    'pile' => -2,
                    'type' => $token->type,
                ]);
            }
        }

        $this->gamestate->nextState($card->power == POWER_CARD ? 'takeCardPower' : 'stay');
    }

    public function playCard(int $id) {
        self::checkAction('playCard');

        $playerId = intval($this->getActivePlayerId());

        $card = $this->array_find($this->argPlayCard()['playableCards'], fn($c) => $c->id == $id);

        if ($card == null || $card->location != 'hand' || $card->locationArg != $playerId) {
            throw new BgaUserException("You can't play this card");
        }

        if ($card->discard) {
            $this->setGameStateValue(SELECTED_CARD, $id);
            $this->gamestate->nextState('discard');
            return;
        } else {
            $this->applyPlayCard($playerId, $card);
        }        
    }

    public function pass() {
        self::checkAction('pass');

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

        $this->applyPlayCard($playerId, $args['selectedCard']);
        $this->setGameStateValue(SELECTED_CARD, -1);
    }

    public function cancel() {
        self::checkAction('cancel');

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

        $this->gamestate->nextState('next');
    }
}
