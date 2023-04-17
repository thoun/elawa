<?php

trait StateTrait {

//////////////////////////////////////////////////////////////////////////////
//////////// Game state actions
////////////

    /*
        Here, you can create methods defined as "game state actions" (see "action" property in states.inc.php).
        The action method of state X is called everytime the current game state is set to X.
    */

    function stNewRound() {
        $this->DbQuery("UPDATE player SET `player_score_aux` = 0");
        $roundNumber = intval($this->getStat('roundNumber'));
        $firstRound = $roundNumber == 0;
        $affectedCosts = [];
        $costs = [1, 2, 3, 4, 5];

        for ($i = 0; $i < 5; $i++) {
            $index = bga_rand(1, count($costs)) - 1;
            $affectedCosts[] = $costs[$index];
            array_splice($costs, $index, 1);
        }
        $this->setGlobalVariable(COSTS, $affectedCosts);

        $this->setBonusObjectives($firstRound);

        $playersIds = $this->getPlayersIds();
        self::notifyAllPlayers('delayBeforeNewRound', '', []);

        // get back scored card to hand
        foreach ($playersIds as $playerId) {
            $this->cards->moveAllCardsInLocation('score'.$playerId, 'hand', null, $playerId);
        }
        if (!$firstRound) {
            self::notifyAllPlayers('newRound', clienttranslate('Scoring cards order have been changed'), [
                'costs' => $affectedCosts,
                'number' => $roundNumber + 1,
            ]);
            
            foreach ($playersIds as $playerId) {
                $card = new Card($this->cards->pickCard('deck', $playerId));

                self::notifyPlayer($playerId, 'newCard', clienttranslate('A new card has been added to your hand : ${addedCard}'), [
                    'card' => $card,
                    'addedCard' => $card->number,
                    'addedCardObj' => $card,
                    'preserve' => ['addedCardObj'],
                ]);
            }
        }

        $objectives = $this->getGlobalVariable(BONUS_OBJECTIVES, true) ?? [];

        if (count($objectives) > 0) {
            foreach ($playersIds as $playerId) {
                $this->updatePlayerScore($playerId, $affectedCosts, $objectives);
            }
        }

        $this->gamestate->nextState('next');
    }

    function stChooseCard() {
        $this->gamestate->setAllPlayersMultiactive();
    }

    function stRevealCards() {
        $tableUnder = $this->getCardsByLocation('selected');

        self::notifyAllPlayers('delayBeforeReveal', '', []);
        self::notifyAllPlayers('revealCards', '', [
            'cards' => json_decode(json_encode($tableUnder)),
        ]);

        foreach($tableUnder as &$card) {
            $card->playerId = $card->locationArg;
        }
        $table = $this->getCardsByLocation('table');

        usort($tableUnder, fn($a, $b) => $a->number - $b->number);

        foreach ($tableUnder as $index => $cardUnder) {
            $this->cards->moveCard($cardUnder->id, 'tableUnder', $index);
            $cardUnder->locationArg = $index;
            $logCardUnder = json_decode(json_encode($cardUnder));
            $logCardOver = $table[$index];

            self::notifyAllPlayers('placeCardUnder', clienttranslate('${player_name} places card ${cardUnder} under ${cardOver} at column ${column}'), [
                'card' => $logCardUnder,
                'playerId' => $cardUnder->playerId,
                'player_name' => $this->getPlayerName($cardUnder->playerId),
                'cardOver' => $logCardOver->number,
                'cardUnder' => $logCardUnder->number,
                'cardOverObj' => $logCardOver,
                'cardUnderObj' => $logCardUnder,
                'column' => $index + 1,
                'preserve' => ['cardOverObj', 'cardUnderObj'],
            ]);
        }

        self::notifyAllPlayers('delayAfterLineUnder', '', []);

        $costs = $this->getGlobalVariable(COSTS, true);
        $objectives = $this->getGlobalVariable(BONUS_OBJECTIVES, true) ?? [];

        foreach ($tableUnder as $index => $cardUnder) {
            $cardOver = $table[$index];
            $col = $this->getCol($cardUnder->playerId, $cardOver->color);
            $this->cards->moveCard($cardOver->id, 'score'.$cardUnder->playerId, $col);
            $cardOver->locationArg = $col;
            $logCard = json_decode(json_encode($cardOver));

            $playerScore = $this->updatePlayerScore($cardUnder->playerId, $costs, $objectives);
            $this->updateStats($cardUnder->playerId, $cardOver->points, $costs[$col]);

            self::notifyAllPlayers('scoreCard', clienttranslate('${player_name} adds card ${scoredCard} to its score column ${column} and scores ${incScoreColumn} points for score card and ${incScoreCard} points for added card points'), [
                'playerId' => $cardUnder->playerId,
                'player_name' => $this->getPlayerName($cardUnder->playerId),
                'card' => $logCard,
                'scoredCard' => $logCard->number,
                'scoredCardObj' => $logCard,
                'incScoreColumn' => $costs[$col],
                'incScoreCard' => $logCard->points,
                'column' => $col + 1,
                'playerScore' => $playerScore,
                'incScore' => $logCard->points,
                'preserve' => ['scoredCardObj'],
            ]);
        }

        $this->cards->moveAllCardsInLocationKeepOrder('tableUnder', 'table');
        self::notifyAllPlayers('moveTableLine', '', []);

        $lastCard = $this->getRemainingCardsInHand() == 1;
        $this->gamestate->nextState($lastCard ? 'lastCard' : 'next');
    }

    function stPlayLastCard() {
        $hands = $this->getCardsByLocation('hand');

        $costs = $this->getGlobalVariable(COSTS, true);
        $objectives = $this->getGlobalVariable(BONUS_OBJECTIVES, true) ?? [];

        foreach ($hands as $card) {
            $playerId = $card->locationArg;
            $col = $this->getCol($playerId, $card->color);
            $this->cards->moveCard($card->id, 'score'.$playerId, $col);
            $card->locationArg = $col;
            $logCard = json_decode(json_encode($card));

            $playerScore = $this->updatePlayerScore($playerId, $costs, $objectives);
            $this->updateStats($playerId, $card->points, $costs[$col]);

            self::notifyAllPlayers('scoreCard', clienttranslate('${player_name} adds card ${scoredCard} to its score column ${column} and scores ${incScoreColumn} points for score card and ${incScoreCard} points for added card points'), [
                'playerId' => $playerId,
                'player_name' => $this->getPlayerName($playerId),
                'card' => $logCard,
                'scoredCard' => $logCard->number,
                'scoredCardObj' => $logCard,
                'incScoreColumn' => $costs[$col],
                'incScoreCard' => $logCard->points,
                'column' => $col + 1,
                'playerScore' => $playerScore,
                'incScore' => $logCard->points,
                'preserve' => ['scoredCardObj'],
            ]);
        }

        $this->gamestate->nextState('endRound');
    }

    function stEndRound() {
        $this->incStat(1, 'roundNumber');

        $roundNumber = $this->getStat('roundNumber');
        $lastRound = $roundNumber >= 3;

        // Header line
        $headers = [''];
        $pointsBefore = [ ['str' => clienttranslate('Points before this round'), 'args' => [] ] ];
        $pointsScoreCards = [ ['str' => clienttranslate('Points from Score cards'), 'args' => [] ] ];
        $pointsBonusMalus = [ ['str' => clienttranslate('Points from bonus/malus'), 'args' => [] ] ];
        $pointsVariant = [ ['str' => clienttranslate('Points from bonus objectives'), 'args' => [] ] ];
        $pointsRound = [ ['str' => clienttranslate('Total points for this round'), 'args' => [] ] ];
        $pointsAfter = [ ['str' => clienttranslate('Points after this round'), 'args' => [] ] ];

        $costs = $this->getGlobalVariable(COSTS, true);
        $objectives = $this->getGlobalVariable(BONUS_OBJECTIVES, true) ?? [];

        // count points remaining in hands
        $playersIds = $this->getPlayersIds();
        foreach($playersIds as $playerId) {
        
            $score = $this->getPlayerScore($playerId);
            $scoreAux = $this->getPlayerScoreAux($playerId);
            $playerName = $this->getPlayerName($playerId);
            $roundScoreDetail = $this->getPlayerScoreDetails($playerId, $costs, $objectives);

            $headers[] = [
                    'str' => '${player_name}',
                    'args' => ['player_name' => $playerName],
                    'type' => 'header'
            ];
            $pointsBefore[] = $score;
            $pointsScoreCards[] = $roundScoreDetail['scoreCardsPoints'];
            $pointsBonusMalus[] = $roundScoreDetail['bonusMalusPoints'];
            $pointsVariant[] = $roundScoreDetail['objectivePoints'];
            $pointsRound[] = $scoreAux;
            $pointsAfter[] = $score + $scoreAux;

            self::notifyAllPlayers('log', clienttranslate('${player_name} ends round ${roundNumber} with ${totalScore} points (${roundScore} points this round)'), [
                'playerId' => $playerId,
                'player_name' => $playerName,
                'roundNumber' => $roundNumber,
                'totalScore' => $score + $scoreAux,
                'roundScore' => $scoreAux,
            ]);
        }

        $table = [$headers, $pointsBefore, $pointsScoreCards, $pointsBonusMalus, $pointsVariant, $pointsRound, $pointsAfter];
        if (count($objectives) == 0) {
            array_splice($table, 4, 1); // remove variant line if no bonus objectives set
        }

        $this->notifyAllPlayers('tableWindow', '', [
            "id" => 'finalScoring',
            "title" =>  clienttranslate('Result of the round'),
            "table" => $table,
            "closing" => $lastRound ? clienttranslate("End of game") : clienttranslate("Next round"),
        ]);

        // apply round score (scoreAux) to score
        $this->DbQuery("UPDATE player SET `player_score` = `player_score` + `player_score_aux`");

        $this->gamestate->nextState($lastRound ? 'endScore' : 'newRound');
    }

    function stEndScore() {
        $this->gamestate->nextState('endGame');
    }
}
