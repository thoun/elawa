<?php

/*
 * Color
 */
define('BLUE', 1);
define('YELLOW', 2);
define('GREEN', 3);
define('RED', 4);
define('PURPLE', 5);

/*
 * Card type
 */
define('HOUSE', 1);
define('STORAGE', 2);
define('HUMAN', 3);
define('TOOL', 4);

define('POWER_CARD', 10);
define('POWER_RESSOURCE', 11);

/*
 * Tokens
 */
define('DISCARD', 0); // special type, only for card resources array
define('DIFFERENT', 0); // special type, only for storage

define('BERRY', 1);
define('MEAT', 2);
define('FLINT', 3);
define('SKIN', 4);
define('BONE', 5);

/*
 * State constants
 */
define('ST_BGA_GAME_SETUP', 1);

define('ST_PLAYER_TAKE_CARD', 10);

define('ST_PLAYER_PLAY_CARD', 20);
define('ST_PLAYER_DISCARD_CARD', 21);

define('ST_PLAYER_STORE_TOKEN', 60);

define('ST_PLAYER_DISCARD_TOKENS', 70);

define('ST_NEXT_PLAYER', 80);

define('ST_END_SCORE', 90);

define('ST_END_GAME', 99);
define('END_SCORE', 100);

/*
 * Constants
 */
define('LAST_TURN', 10);
define('SELECTED_CARD', 11);

/*
 * Options
 */
define('CHIEFTAIN_OPTION', 100);

/*
 * Global variables
 */
define('COSTS', 'COSTS');
define('BONUS_OBJECTIVES', 'BONUS_OBJECTIVES');
define('USED_LETTERS', 'USED_LETTERS');


?>
