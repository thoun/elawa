<?php

trait UtilTrait {

    //////////////////////////////////////////////////////////////////////////////
    //////////// Utility functions
    ////////////

    function array_find(array $array, callable $fn) {
        foreach ($array as $value) {
            if($fn($value)) {
                return $value;
            }
        }
        return null;
    }

    function array_find_key(array $array, callable $fn) {
        foreach ($array as $key => $value) {
            if($fn($value)) {
                return $key;
            }
        }
        return null;
    }

    function array_some(array $array, callable $fn) {
        foreach ($array as $value) {
            if($fn($value)) {
                return true;
            }
        }
        return false;
    }
    
    function array_every(array $array, callable $fn) {
        foreach ($array as $value) {
            if(!$fn($value)) {
                return false;
            }
        }
        return true;
    }

    function setGlobalVariable(string $name, /*object|array*/ $obj) {
        /*if ($obj == null) {
            throw new \Error('Global Variable null');
        }*/
        $jsonObj = json_encode($obj);
        $this->DbQuery("INSERT INTO `global_variables`(`name`, `value`)  VALUES ('$name', '$jsonObj') ON DUPLICATE KEY UPDATE `value` = '$jsonObj'");
    }

    function getGlobalVariable(string $name, $asArray = null) {
        $json_obj = $this->getUniqueValueFromDB("SELECT `value` FROM `global_variables` where `name` = '$name'");
        if ($json_obj) {
            $object = json_decode($json_obj, $asArray);
            return $object;
        } else {
            return null;
        }
    }

    function deleteGlobalVariable(string $name) {
        $this->DbQuery("DELETE FROM `global_variables` where `name` = '$name'");
    }

    function getPlayersIds() {
        return array_keys($this->loadPlayersBasicInfos());
    }

    function getRoundCardCount() {
        return count($this->getPlayersIds()) + 2;
    }

    function getPlayerName(int $playerId) {
        return self::getUniqueValueFromDB("SELECT player_name FROM player WHERE player_id = $playerId");
    }

    function getPlayerScore(int $playerId) {
        return intval($this->getUniqueValueFromDB("SELECT player_score FROM player where `player_id` = $playerId"));
    }

    function getPlayerScoreAux(int $playerId) {
        return intval($this->getUniqueValueFromDB("SELECT player_score_aux FROM player where `player_id` = $playerId"));
    }

    function getPlayerSelectedCard(int $playerId) {
        $cards = $this->getCardsByLocation('selected', $playerId);
        return $cards != null ? $cards[0] : null;
    }

    function setPlayerSelectedCard(int $playerId, /*int|null*/ $selectedCardId) {
        $selected = $selectedCardId !== null;
        $card = $selected ? $this->getCardById($selectedCardId) : $this->getPlayerSelectedCard($playerId);
        $this->cards->moveCard($card->id, $selected ? 'selected' : 'hand', $playerId);
        $this->notifyAllPlayers('selectedCard', '', [
            'playerId' => $playerId,
            'card' => Card::onlyId($card),
            'cancel' => !$selected,
        ]);
        $this->notifyPlayer($playerId, 'selectedCard', '', [
            'playerId' => $playerId,
            'card' => $card,
            'cancel' => !$selected,
        ]);
    }

    function getCardFromDb(array $dbCard) {
        if ($dbCard == null) {
            return null;
        }
        return new Card($dbCard, $this->CARDS);
    }

    function getCardById(int $id) {
        $sql = "SELECT * FROM `card` WHERE `card_id` = $id";
        $dbResults = $this->getCollectionFromDb($sql);
        $cards = array_map(fn($dbCard) => $this->getCardFromDb($dbCard), array_values($dbResults));
        return count($cards) > 0 ? $cards[0] : null;
    }

    function getCardsByLocation(string $location, /*int|null*/ $location_arg = null, /*int|null*/ $type = null, /*int|null*/ $number = null) {
        $sql = "SELECT * FROM `card` WHERE `card_location` = '$location'";
        if ($location_arg !== null) {
            $sql .= " AND `card_location_arg` = $location_arg";
        }
        if ($type !== null) {
            $sql .= " AND `card_type` = $type";
        }
        if ($number !== null) {
            $sql .= " AND `card_type_arg` = $number";
        }
        $sql .= " ORDER BY `card_location_arg`";
        $dbResults = $this->getCollectionFromDb($sql);
        return array_map(fn($dbCard) => $this->getCardFromDb($dbCard), array_values($dbResults));
    }

    function setupCards() {
        // number cards
        $cards = [];
        for ($color = 1; $color <= 5; $color++) {
            for ($i = 1; $i <= 12; $i++) {
                $cards[] = [ 'type' => $color, 'type_arg' => $i, 'nbr' => 1 ];
            }
        }
        $this->cards->createCards($cards, 'deck');
        $this->cards->shuffle('deck');

        foreach ([0,1,2,3,4,5] as $pile) {
            $this->cards->pickCardsForLocation(10, 'deck', 'pile'.$pile);
            $this->cards->shuffle('pile'.$pile); // to give them a locationArg asc
        }
    }

    function getTokenFromDb(array $dbCard) {
        if ($dbCard == null) {
            return null;
        }
        return new Token($dbCard);
    }

    function getTokensByLocation(string $location, /*int|null*/ $location_arg = null, /*int|null*/ $type = null, /*int|null*/ $number = null) {
        $sql = "SELECT * FROM `token` WHERE `card_location` = '$location'";
        if ($location_arg !== null) {
            $sql .= " AND `card_location_arg` = $location_arg";
        }
        if ($type !== null) {
            $sql .= " AND `card_type` = $type";
        }
        if ($number !== null) {
            $sql .= " AND `card_type_arg` = $number";
        }
        $sql .= " ORDER BY `card_location_arg`";
        $dbResults = $this->getCollectionFromDb($sql);
        return array_map(fn($dbCard) => $this->getTokenFromDb($dbCard), array_values($dbResults));
    }

    function setupTokens(int $playerCount) {
        $tokens = [
            [ 'type' => BERRY, 'type_arg' => null, 'nbr' => 24 ],
            [ 'type' => MEAT, 'type_arg' => null, 'nbr' => 20 ],
            [ 'type' => FLINT, 'type_arg' => null, 'nbr' => 16 ],
            [ 'type' => SKIN, 'type_arg' => null, 'nbr' => 12 ],
            [ 'type' => BONE, 'type_arg' => null, 'nbr' => 8 ],
        ];
        for ($i = 1; $i <= 60; $i++) {
            $cards[] = [ 'type' => 1, 'type_arg' => $i, 'nbr' => 1 ];
        }
        $this->tokens->createCards($tokens, 'deck');
        $this->tokens->shuffle('deck');

        foreach ([0,1,2,3,4,5] as $pile) {
            $this->tokens->pickCardsForLocation(5, 'deck', 'pile'.$pile);
            $this->tokens->shuffle('pile'.$pile); // to give them a locationArg asc
        }

        $this->tokens->pickCardsForLocation($this->CENTER_RESOURCES_BY_PLAYER_COUNT[$playerCount], 'deck', 'center');
        $this->tokens->shuffle('center'); // to give them a locationArg asc
    }

    function getCol(int $playerId, int $color) {
        $cards = $this->getCardsByLocation('score'.$playerId);

        $card = $this->array_find($cards, fn($c) => $c->color == $color);
        if ($card != null) {
            return $card->locationArg;
        } else {
            $maxLocationArg = -1;

            foreach($cards as $c) {
                if ($c->locationArg > $maxLocationArg) {
                    $maxLocationArg = $c->locationArg;
                }
            }

            return $maxLocationArg + 1;
        }
    }

    function getColByColor(array $scoredCards, int $color) {
        $scoreCardsOfColor = $this->array_find($scoredCards, fn($card) => $card->color == $color);

        return $scoreCardsOfColor !== null ? $scoreCardsOfColor->locationArg : null;
    }

    function getPlayerCardCountForColor(int $color) {
        $cardCountForColor = [];

        $playersIds = $this->getPlayersIds();
        foreach($playersIds as $playerId) {
            $scoredCards = $this->getCardsByLocation('score'.$playerId);
            $scoresCardsOfColor = array_values(array_filter($scoredCards, fn($card) => $card->color == $color));
            $cardCountForColor[$playerId] = count($scoresCardsOfColor);
        }

        return $cardCountForColor;
    }

    function getObjectivePoints(int $objective, array $scoredCards, array $cardsByColor, array $costs) {        
        switch ($objective) {
            case 1: return in_array(count($cardsByColor[ORANGE]), [1, 3]) ? 2 : 0;
            case 2: $col = $this->getColByColor($scoredCards, ORANGE); return $col !== null && in_array($costs[$col], [1, 2]) ? -2 : 0;
            case 3: return in_array(count($cardsByColor[BLUE]), [2, 4]) ? 2 : 0;
            case 4: 
                $blueCount = count($cardsByColor[BLUE]);
                return !$this->array_some($cardsByColor, fn($colorCards) => count($colorCards) > $blueCount) ? 2 : 0;
            case 5: 
                $currentPlayerCount = count($cardsByColor[PINK]);
                $cardCountForColor = $this->getPlayerCardCountForColor(PINK);
                return !$this->array_some($cardCountForColor, fn($cardCount) => $cardCount < $currentPlayerCount) == 3 ? -2 : 0;
            case 6: 
                $currentPlayerCount = count($cardsByColor[PINK]);
                $cardCountForColor = $this->getPlayerCardCountForColor(PINK);
                return !$this->array_some($cardCountForColor, fn($cardCount) => $cardCount > $currentPlayerCount) == 3 ? 2 : 0;
            case 7: 
                $lastColor = null;
                for ($i=0; $i<5; $i++) {
                    $scoresCardsOfColor = array_values(array_filter($scoredCards, fn($card) => $card->locationArg == $i));
                    if (count($scoresCardsOfColor) > 0) {
                        $lastColor = $scoresCardsOfColor[0]->color;
                    }
                }
                return $lastColor == GREEN ? 2 : 0;
            case 8: $col = $this->getColByColor($scoredCards, GREEN); return $col !== null && in_array($costs[$col], [4, 5]) ? 2 : 0;
            case 9: return count($cardsByColor[PURPLE]) >= count($cardsByColor[ORANGE]) ? 2 : 0;
            case 10: 
                $currentPlayerCount = count($cardsByColor[PURPLE]);
                $cardCountForColor = $this->getPlayerCardCountForColor(PURPLE);
                return !$this->array_some($cardCountForColor, fn($cardCount) => $cardCount > $currentPlayerCount) == 3 ? -2 : 0;
            case 11: return count(array_filter($cardsByColor, fn($cards) => count($cards) > 0)) == 5 ? 2 : 0;
            case 12: return count(array_filter($cardsByColor, fn($cards) => count($cards) > 0)) == 3 ? 2 : 0;
            case 13: return $this->array_some($cardsByColor, fn($colorCards) => count($colorCards) == 3) ? -2 : 0;
            case 14: return $this->array_some($cardsByColor, fn($colorCards) => count($colorCards) == 4) ? 2 : 0;
        }
        return 0;
    }

    function getPlayerScoreDetails(int $playerId, array $costs, array $objectives) {
        $scoreCardsPoints = 0;
        $bonusMalusPoints = 0;
        $objectivePoints = 0;

        $scoredCards = $this->getCardsByLocation('score'.$playerId);
        $cardsByColor = [
            ORANGE => [],
            PINK => [],
            BLUE => [],
            GREEN => [],
            PURPLE => [],
        ];

        for ($i=0; $i<5; $i++) {
            $scoresCardsOfColor = array_values(array_filter($scoredCards, fn($card) => $card->locationArg == $i));
            foreach ($scoresCardsOfColor as $card) {
                $scoreCardsPoints += $costs[$i];
                $bonusMalusPoints += $card->points;
                $cardsByColor[$card->color][] = $card;
            }
        }

        foreach ($objectives as $objective) {
            $objectivePoints += $this->getObjectivePoints($objective, $scoredCards, $cardsByColor, $costs);
        }
        return [
            'scoreCardsPoints' => $scoreCardsPoints,
            'bonusMalusPoints' => $bonusMalusPoints,
            'objectivePoints' => $objectivePoints,
            'roundScore' => $scoreCardsPoints + $bonusMalusPoints + $objectivePoints,
        ];
    }

    function updatePlayerScore(int $playerId, array $costs, array $objectives) {
        $roundScore = $this->getPlayerScoreDetails($playerId, $costs, $objectives)['roundScore'];

        $this->DbQuery("UPDATE player SET `player_score_aux` = $roundScore WHERE `player_id` = $playerId");

        return $this->getPlayerScore($playerId) + $roundScore;
    }
    
    function updateStats(int $playerId, int $cardPoints, int $scoreCardPoints) {
        $this->incStat($cardPoints, 'cardPoints');
        $this->incStat($cardPoints, 'cardPoints', $playerId);
        $this->incStat($scoreCardPoints, 'scoreCardPoints');
        $this->incStat($scoreCardPoints, 'scoreCardPoints', $playerId);
    }

    function getBonusObjectivesNumber() {
        return intval($this->getGameStateValue(CHIEFTAIN_OPTION));
    }

    function setBonusObjectives(bool $firstRound) {
        $number = $this->getBonusObjectivesNumber();

        if ($number == 0 || ($number >= 3 && !$firstRound)) {
            return;
        }

        $selectedLetters = [];
        $usedLetters = $this->getGlobalVariable(USED_LETTERS, true) ?? [];
        $availableLetters = array_values(array_filter([0, 1, 2, 3, 4, 5, 6], fn($letter) => !in_array($letter, $usedLetters)));

        for ($i = 0; $i < $number; $i++) {
            $index = bga_rand(1, count($availableLetters)) - 1;
            $selectedLetters[] = $availableLetters[$index];
            array_splice($availableLetters, $index, 1);
        }

        $objectives = array_map(fn($letter) => $letter * 2 + bga_rand(1, 2), $selectedLetters);

        $this->setGlobalVariable(BONUS_OBJECTIVES, $objectives);
        $usedLetters = array_merge($usedLetters, $selectedLetters);
        $this->setGlobalVariable(USED_LETTERS, $usedLetters);

        if (!$firstRound) {
            self::notifyAllPlayers('newObjectives', clienttranslate('Bonus objective cards have been changed'), [
                'objectives' => $objectives,
            ]);
        }
    }

    function getRemainingCardsInHand() {
        $playersIds = $this->getPlayersIds();
        $playerId = $playersIds[0];
        return count($this->getCardsByLocation('hand', $playerId));
    }

    function getPlayerResources(int $playerId) {
        $tokens = $this->getTokensByLocation('player', $playerId);
        $resources = [
            1 => [],
            2 => [],
            3 => [],
            4 => [],
            5 => [],
        ];
        foreach($tokens as $token) {
            $resources[$token->type][] = $token;
        }

        return $resources;
    }

    function tokensToPayForCard(Card $card, array $resources, /*array | null*/ $hand = null) {
        if ($hand !== null && $card->discard && count($hand) <= 1) {
            return null; // no card to discard
        }

        $tokensToPayForCard = [];
        $missingResources = 0;
        for ($i = 1; $i <= 4; $i++) {
            $requiredForCard = count(array_filter($card->resources, fn($resource) => $resource == $i));
            $available = count($resources[$i]);
            $tokensToPayForCard = array_merge($tokensToPayForCard, array_slice($resources[$i], 0, min($requiredForCard, $available)));
            if ($requiredForCard > $available) {
                $missingResources += ($requiredForCard - $available);
            }
        }

        if (count($resources[BONE]) >= $missingResources) {
            $tokensToPayForCard = array_merge($tokensToPayForCard, array_slice($resources[BONE], 0, $missingResources));
        } else {
            return null;
        }

        return $tokensToPayForCard;
    }
    
}
