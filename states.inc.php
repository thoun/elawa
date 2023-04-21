<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Elawa implementation : © <Your name here> <Your email address here>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 * 
 * states.inc.php
 *
 * Elawa game states description
 *
 */

/*
   Game state machine is a tool used to facilitate game developpement by doing common stuff that can be set up
   in a very easy way from this configuration file.

   Please check the BGA Studio presentation about game state to understand this, and associated documentation.

   Summary:

   States types:
   _ activeplayer: in this type of state, we expect some action from the active player.
   _ multipleactiveplayer: in this type of state, we expect some action from multiple players (the active players)
   _ game: this is an intermediary state where we don't expect any actions from players. Your game logic must decide what is the next game state.
   _ manager: special type for initial and final state

   Arguments of game states:
   _ name: the name of the GameState, in order you can recognize it on your own code.
   _ description: the description of the current game state is always displayed in the action status bar on
                  the top of the game. Most of the time this is useless for game state with "game" type.
   _ descriptionmyturn: the description of the current game state when it's your turn.
   _ type: defines the type of game states (activeplayer / multipleactiveplayer / game / manager)
   _ action: name of the method to call when this game state become the current game state. Usually, the
             action method is prefixed by "st" (ex: "stMyGameStateName").
   _ possibleactions: array that specify possible player actions on this step. It allows you to use "checkAction"
                      method on both client side (Javacript: this.checkAction) and server side (PHP: self::checkAction).
   _ transitions: the transitions are the possible paths to go from a game state to another. You must name
                  transitions in order to use transition names in "nextState" PHP method, and use IDs to
                  specify the next game state for each transition.
   _ args: name of the method to call to retrieve arguments for this gamestate. Arguments are sent to the
           client side to be used on "onEnteringState" or to set arguments in the gamestate description.
   _ updateGameProgression: when specified, the game progression is updated (=> call to your getGameProgression
                            method).
*/
require_once("modules/php/constants.inc.php");

$basicGameStates = [

    // The initial state. Please do not modify.
    ST_BGA_GAME_SETUP => [
        "name" => "gameSetup",
        "description" => clienttranslate("Game setup"),
        "type" => "manager",
        "action" => "stGameSetup",
        "transitions" => [ "" => ST_PLAYER_TAKE_CARD ]
    ],
   
    // Final state.
    // Please do not modify.
    ST_END_GAME => [
        "name" => "gameEnd",
        "description" => clienttranslate("End of game"),
        "type" => "manager",
        "action" => "stGameEnd",
        "args" => "argGameEnd",
    ],
];

$playerActionsGameStates = [

    ST_PLAYER_TAKE_CARD => [
        "name" => "takeCard",
        "description" => clienttranslate('${actplayer} must take a tribe card on the table'),
        "descriptionmyturn" => clienttranslate('${you} must take a tribe card on the table'),
        "type" => "activeplayer",
        "args" => "argTakeCard",
        "possibleactions" => [ 
            "takeCard",
        ],
        "transitions" => [
            "next" => ST_PLAYER_PLAY_CARD,
        ]
    ],

    ST_PLAYER_PLAY_CARD => [
        "name" => "playCard",
        "description" => clienttranslate('${actplayer} can play a tribe card from your hand'),
        "descriptionmyturn" => clienttranslate('${you} can play a tribe card from your hand'),
        "type" => "activeplayer",    
        "args" => "argPlayCard",
        "action" => "stPlayCard",
        "possibleactions" => [ 
            "playCard",
            "pass",
        ],
        "transitions" => [
            "stay" => ST_PLAYER_PLAY_CARD,
            "discard" => ST_PLAYER_DISCARD_CARD,
            "next" => ST_PLAYER_STORE_TOKEN,
        ],
    ],

    ST_PLAYER_DISCARD_CARD => [
        "name" => "discardCard",
        "description" => clienttranslate('${actplayer} must discard a card to play selected card'),
        "descriptionmyturn" => clienttranslate('${you} must discard a card from your hand to play selected card'),
        "type" => "activeplayer",    
        "args" => "argDiscardCard",
        "possibleactions" => [ 
            "discardCard",
            "cancel",
        ],
        "transitions" => [
            "next" => ST_PLAYER_PLAY_CARD,
        ],
    ],

    ST_PLAYER_STORE_TOKEN => [
        "name" => "storeToken",
        "description" => clienttranslate('${actplayer} can place a resource on a storage tribe card'),
        "descriptionmyturn" => clienttranslate('${you} can place a resource on a storage tribe card'),
        "type" => "activeplayer",    
        "args" => "argStoreToken",
        "action" => "stStoreToken",
        "possibleactions" => [ 
            "storeToken",
            "pass",
        ],
        "transitions" => [
            "next" => ST_PLAYER_DISCARD_TOKENS,
        ],
    ],

    ST_PLAYER_DISCARD_TOKENS => [
        "name" => "discardTokens",
        "description" => clienttranslate('${actplayer} must select ${number} resources to keep'),
        "descriptionmyturn" => clienttranslate('${you} must select ${number} resources to keep'),
        "type" => "activeplayer",    
        "args" => "argDiscardTokens",
        "action" => "stDiscardTokens",
        "possibleactions" => [ 
            "keepSelectedTokens",
        ],
        "transitions" => [
            "next" => ST_NEXT_PLAYER,
        ],
    ],
];

$gameGameStates = [

    ST_NEXT_PLAYER => [
        "name" => "nextPlayer",
        "description" => "",
        "type" => "game",
        "action" => "stNextPlayer",
        "transitions" => [
            "nextPlayer" => ST_PLAYER_TAKE_CARD,
            "endScore" => ST_END_SCORE,
        ],
    ],

    ST_END_SCORE => [
        "name" => "endScore",
        "description" => "",
        "type" => "game",
        "action" => "stEndScore",
        "transitions" => [
            "endGame" => ST_END_GAME,
        ],
    ],
];
 
$machinestates = $basicGameStates + $playerActionsGameStates + $gameGameStates;



