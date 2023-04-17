<?php

trait StateTrait {

//////////////////////////////////////////////////////////////////////////////
//////////// Game state actions
////////////

    /*
        Here, you can create methods defined as "game state actions" (see "action" property in states.inc.php).
        The action method of state X is called everytime the current game state is set to X.
    */

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

    function stEndScore() {
        $this->gamestate->nextState('endGame');
    }
}
