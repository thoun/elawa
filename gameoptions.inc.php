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
 * gameoptions.inc.php
 *
 * Elawa game options description
 * 
 * In this file, you can define your game options (= game variants).
 *   
 * Note: If your game has no variant, you don't have to modify this file.
 *
 * Note²: All options defined in this file should have a corresponding "game state labels"
 *        with the same ID (see "initGameStateLabels" in elawa.game.php)
 *
 * !! It is not a good idea to modify this file when a game is running !!
 *
 */

require_once("modules/php/constants.inc.php");

 $game_options = [

    CHIEFTAIN_OPTION => [
        'name' => totranslate('Chieftain cards'),
        'values' => [
            1 => [
                'name' => totranslate('Normal side'),
            ],
            2 => [
                'name' => totranslate('Advanced side'),
                'tmdisplay' => totranslate('Advanced chieftain card side'),
            ],
        ],
        'default' => 1,
    ],
];



$game_preferences = [
    201 => [
        'name' => totranslate('Center cards placement'),
        'needReload' => false,
        'values' => [
            1 => ['name' => totranslate('Easy to read')],
            2 => ['name' => totranslate('Follow fire circle')],
        ],
        'default' => 1,
    ],
];