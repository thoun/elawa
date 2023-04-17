<?php

require_once(__DIR__.'/../constants.inc.php');


class Card {

    public int $id;
    public string $location;
    public int $locationArg;
    public /*int|null*/ $number;
    public /*int|null*/ $color;
    public /*int|null*/ $points;
    public /*int|null*/ $playerId;

    public function __construct($dbCard) {

        $POINTS = [-1, 0, 1, 2, 1, 0];

        $this->id = intval($dbCard['card_id'] ?? $dbCard['id']);
        $this->location = $dbCard['card_location'] ?? $dbCard['location'];
        $this->locationArg = intval($dbCard['card_location_arg'] ?? $dbCard['location_arg']);
        $this->number = array_key_exists('card_type_arg', $dbCard) || array_key_exists('type_arg', $dbCard) ? intval($dbCard['card_type_arg'] ?? $dbCard['type_arg']) : null;
        $this->color = $this->number ? 1 : null;
        $this->points = $this->number ? $POINTS[($this->number - ($this->number >= 31 ? 0 : 1)) % 6] : null;
    } 

    public static function onlyId(Card $card) {
        return new Card([
            'card_id' => $card->id,
            'card_location' => $card->location,
            'card_location_arg' => $card->locationArg,
        ], null);
    }

    public static function onlyIds(array $cards) {
        return array_map(fn($card) => self::onlyId($card), $cards);
    }
}

?>