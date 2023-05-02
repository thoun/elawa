<?php

trait DebugUtilTrait {

//////////////////////////////////////////////////////////////////////////////
//////////// Utility functions
////////////

    function debugSetup() {
        if ($this->getBgaEnvironment() != 'studio') { 
            return;
        } 
        
        //$this->debugLastTurn();
    }

    function debugPickResources($playerId = 2343492) {
		$this->tokens->pickCardsForLocation(20, 'deck', 'player', $playerId);
    }

    function debugAlmostEmptyPile($pile) {
		$tokenCount = intval($this->tokens->countCardInLocation('pile'.$pile));
        $this->tokens->pickCardsForLocation($tokenCount - 1, 'pile'.$pile, 'discard');
    }

    function debugEmptyFire($remaining = 1) {
		$fireTokenCount = intval($this->tokens->countCardInLocation('center'));
        $this->tokens->pickCardsForLocation($fireTokenCount - $remaining, 'center', 'discard');
    }

    function debugLastTurn() {
        $this->setGameStateValue(LAST_TURN, 1);
    }

    public function debugReplacePlayersIds() {
        if ($this->getBgaEnvironment() != 'studio') { 
            return;
        } 

		// These are the id's from the BGAtable I need to debug.
		/*$ids = [
            84319026,
86175279
		];*/
        $ids = array_map(fn($dbPlayer) => intval($dbPlayer['player_id']), array_values($this->getCollectionFromDb('select player_id from player order by player_no')));

		// Id of the first player in BGA Studio
		$sid = 2343492;
		
		foreach ($ids as $id) {
			// basic tables
			$this->DbQuery("UPDATE player SET player_id=$sid WHERE player_id = $id" );
			$this->DbQuery("UPDATE global SET global_value=$sid WHERE global_value = $id" );
			$this->DbQuery("UPDATE card SET card_location_arg=$sid WHERE card_location_arg = $id" );

			// 'other' game specific tables. example:
			// tables specific to your schema that use player_ids
			$this->DbQuery("UPDATE card SET card_location='played$sid' WHERE card_location='played$id'" );
			$this->DbQuery("UPDATE token SET card_location_arg=$sid WHERE card_location_arg = $id" );
            
			++$sid;
		}

        self::reloadPlayersBasicInfos();
	}

    function debug($debugData) {
        if ($this->getBgaEnvironment() != 'studio') { 
            return;
        }die('debug data : '.json_encode($debugData));
    }
}
