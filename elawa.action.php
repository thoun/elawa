<?php
/**
 *------
 * BGA framework: © Gregory Isabelli <gisabelli@boardgamearena.com> & Emmanuel Colin <ecolin@boardgamearena.com>
 * Elawa implementation : © <Your name here> <Your email address here>
 *
 * This code has been produced on the BGA studio platform for use on https://boardgamearena.com.
 * See http://en.doc.boardgamearena.com/Studio for more information.
 * -----
 * 
 * elawa.action.php
 *
 * Elawa main action entry point
 *
 *
 * In this file, you are describing all the methods that can be called from your
 * user interface logic (javascript).
 *       
 * If you define a method "myAction" here, then you can call it from your javascript code with:
 * this.ajaxcall( "/elawa/elawa/myAction.html", ...)
 *
 */
  
  
  class action_elawa extends APP_GameAction
  { 
    // Constructor: please do not modify
   	public function __default()
  	{
  	    if( self::isArg( 'notifwindow') )
  	    {
            $this->view = "common_notifwindow";
  	        $this->viewArgs['table'] = self::getArg( "table", AT_posint, true );
  	    }
  	    else
  	    {
            $this->view = "elawa_elawa";
            self::trace( "Complete reinitialization of board game" );
      }
  	} 

    public function takeCard() {
        self::setAjaxMode();     

        $pile = self::getArg("pile", AT_posint, true);
        $this->game->takeCard($pile);

        self::ajaxResponse();
    } 

    public function playCard() {
        self::setAjaxMode();     

        $id = self::getArg("id", AT_posint, true);
        $this->game->playCard($id);

        self::ajaxResponse();
    }

    public function skipResource() {
        self::setAjaxMode();     

        $number = self::getArg("number", AT_posint, true);
        $this->game->skipResource($number);

        self::ajaxResponse();
    }

    public function pass() {
        self::setAjaxMode();

        $this->game->pass();

        self::ajaxResponse();
    }

    public function discardCard() {
        self::setAjaxMode();     

        $id = self::getArg("id", AT_posint, true);
        $this->game->discardCard($id);

        self::ajaxResponse();
    }

    public function cancel() {
        self::setAjaxMode();     

        $this->game->cancel();

        self::ajaxResponse();
    }

    public function storeTokens() {
        self::setAjaxMode();     

        $tokens = self::getArg( "tokens", AT_json, true );
        $this->game->storeTokens($tokens);

        self::ajaxResponse();
    }

    public function keepSelectedTokens() {
        self::setAjaxMode();     

        $idsStr = self::getArg( "ids", AT_numberlist, true );
        $ids = array_map(fn($str) => intval($str), explode(',', $idsStr));
        $this->game->keepSelectedTokens($ids);

        self::ajaxResponse();
    }
  }
  

