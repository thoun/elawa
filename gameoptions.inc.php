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

    BONUS_OBJECTIVES_OPTION => [
        'name' => totranslate('Bonus objectives'),
        'values' => [
            0 => [
                'name' => totranslate('Disabled'),
            ],
            1 => [
                'name' => totranslate('1 random objective'),
                'tmdisplay' => totranslate('1 random objective'),
                'description' => totranslate('1 random objective (changing each round)'),
            ],
            2 => [
                'name' => totranslate('2 random objectives'),
                'tmdisplay' => totranslate('2 random objectives'),
                'description' => totranslate('2 random objectives (changing each round)'),
            ],
            3 => [
                'name' => totranslate('3 random objectives'),
                'tmdisplay' => totranslate('3 random objectives'),
                'description' => totranslate('3 random objectives (set for the entire game)'),
            ],
            4 => [
                'name' => totranslate('4 random objectives'),
                'tmdisplay' => totranslate('4 random objectives'),
                'description' => totranslate('4 random objectives (set for the entire game)'),
            ],
            5 => [
                'name' => totranslate('5 random objectives'),
                'tmdisplay' => totranslate('5 random objectives'),
                'description' => totranslate('5 random objectives (set for the entire game)'),
            ],
        ],
        'default' => 0,
    ],
];