class TableCenter {

    private spots: CenterSpot[] = [];

    private ferriesCounter: Counter;
    private sentFerriesCounter: Counter;
        
    constructor(private game: ElawaGame, gamedatas: ElawaGamedatas) {
                let html = '';
        
                for (let i=0;i<6;i++) {
                    this.spots.push(new CenterSpot(game, i, gamedatas.centerCards[i], gamedatas.centerTokens[i]));
                }
        
                /*this.ferriesCounter = new ebg.counter();
                this.ferriesCounter.create('remaining-ferry-counter');
                this.ferriesCounter.setValue(remainingFerries);
                this.sentFerriesCounter = new ebg.counter();
                this.sentFerriesCounter.create('sent-ferry-counter');
                this.sentFerriesCounter.setValue(sentFerries);
                
                if (topFerry) {
                    dojo.toggleClass(`ferry-deck`, 'roomates', topFerry.roomates);
                }*/
            }
        
            /*private getNoahStyle(noahPosition: number) {
        
                let noahLastPositionMod = this.noahLastPosition % 5;
                if (Math.abs(noahLastPositionMod - noahPosition) > 2) {
                    noahLastPositionMod -= 5;
                }
                const spotsToGoUp = (noahPosition - noahLastPositionMod) % 5;
        
                const newPosition = spotsToGoUp > 2 ? 
                    this.noahLastPosition + spotsToGoUp - 5 :
                    this.noahLastPosition + spotsToGoUp;
        
                this.noahLastPosition = newPosition;
        
                return `rotate(${72 * newPosition + 90}deg) translateY(90px)`;
            }
        
            private getPointsCoordinates(points: number) {
                if (points === 0) {
                    return [202, 64];
                }
                const pointWithMaxLimit = Math.min(-points, MAX_SCORE);
                const angle = -((1-pointWithMaxLimit)/MAX_SCORE)*Math.PI*2; // in radians
                const left = POINTS_RADIUS*Math.sin(angle);
                let top = -POINTS_RADIUS*Math.cos(angle);
        
                return [202 + left, 213 + top];
            }
            
            public noahMoved(position: number) {
                this.noahPosition = position;
        
                document.getElementById('noah').style.transform = this.getNoahStyle(position);
        
                this.spots.forEach((spot, index) => spot.setActive(index == position));
            }
        
            public setPoints(playerId: number, points: number) {
                if (this.game.gamedatas.solo) {
                    return;
                }
                this.points.set(playerId, points);
                this.movePoints();
            }
        
            private movePoints() {
                this.points.forEach((points, playerId) => {
                    const markerDiv = document.getElementById(`player-${playerId}-point-marker`);
        
                    const coordinates = this.getPointsCoordinates(points);
                    const left = coordinates[0];
                    const top = coordinates[1];
            
                    let topShift = 0;
                    let leftShift = 0;
                    this.points.forEach((iPoints, iPlayerId) => {
                        if (iPoints === points && iPlayerId < playerId) {
                            topShift += 5;
                            leftShift += 5;
                        }
                    });
            
                    markerDiv.style.transform = `translateX(${left + leftShift}px) translateY(${top + topShift}px)`;
                });
            }
        
            // gameui.table.updateMargins();
            public updateMargins() {
                const board = document.getElementById('center-board');
                const boardBR = board.getBoundingClientRect();
        
                let topMargin = 0;
                let bottomMargin = 0;
                let leftMargin = 0;
                let rightMargin = 0;
        
                this.spots.forEach(spot => {
                    const spotDiv = document.getElementById(`center-spot-${spot.position}`);
        
                    spotDiv.style.height = `${spot.animals.length ? FIRST_ANIMAL_SHIFT + ANIMAL_HEIGHT + ((spot.animals.length-1) * CARD_OVERLAP) : FERRY_HEIGHT}px`;
                    const spotBR = spotDiv.getBoundingClientRect();
        
                    if (spotBR.y < boardBR.y - topMargin) {
                        topMargin = boardBR.y - spotBR.y;
                    }
        
                    if (spotBR.y + spotBR.height > boardBR.y + boardBR.height + bottomMargin) {
                        bottomMargin = (spotBR.y + spotBR.height) - (boardBR.y + boardBR.height);
                    }
        
                    if (spotBR.x < boardBR.x - leftMargin) {
                        leftMargin = boardBR.x - spotBR.x;
                    }
                    if (spotBR.x + spotBR.width > boardBR.x + boardBR.width + rightMargin) {
                        rightMargin = (spotBR.x + spotBR.width) - (boardBR.x + boardBR.width);
                    }
                });
        
                topMargin = topMargin / this.game.getZoom();
                bottomMargin = bottomMargin / this.game.getZoom();
                leftMargin = leftMargin / this.game.getZoom();
                rightMargin = rightMargin / this.game.getZoom();
        
                board.style.marginTop = `${topMargin}px`;
                board.style.marginBottom = `${bottomMargin}px`;
                board.style.marginLeft = `${leftMargin}px`;
                board.style.marginRight = `${rightMargin}px`;
                
                this.neededScreenWidth = 444 + leftMargin + rightMargin;
                this.game.setMaxZoom();
            }
        
            public addAnimal(animal: Animal, originId?: string, xShift: number = 0) {
                this.spots[this.noahPosition].addAnimal(animal, originId, xShift);
        
                this.updateMargins();
            }
        
            public removeAnimals() {
                this.spots[this.noahPosition].removeAnimals();
        
                this.updateMargins();
            }
            
            public removeFirstAnimalFromFerry() {
                this.spots[this.noahPosition].removeFirstAnimalFromFerry();
        
                this.updateMargins();
            }
        
            public departure(position: number, topFerry: Ferry, newFerry: Ferry, remainingFerries: number, sentFerries: number) {
                if (topFerry) {
                    dojo.toggleClass(`ferry-deck`, 'roomates', topFerry.roomates);
                }
        
                this.ferriesCounter.setValue(remainingFerries);
                this.sentFerriesCounter.setValue(sentFerries);
        
                this.spots[position].departure();
                // ferry is destroy, we build a new one
                this.spots[position] = new FerrySpot(this.game, position, newFerry, true);
        
        
                this.updateMargins();
            }
            
            public newRound(ferries: Ferry[], remainingFerries: number, sentFerries: number) {
                this.ferriesCounter.setValue(3);
                for (let i=0;i<5;i++) {
                    this.spots[i].newRound(ferries[i]);
                }
        
                this.ferriesCounter.setValue(remainingFerries);
                this.sentFerriesCounter.setValue(sentFerries);
            }
        
            public removeAnimalToDeck(animal: Animal) {
                this.spots[Number(animal.location.replace('table', ''))].removeAnimalToDeck(animal);
            }
            
            public makeCardsSelectable(animals: Animal[]) {
                (Array.from(document.getElementsByClassName('animal-card')) as HTMLDivElement[]).forEach(elem => {
                    const elemAnimalId = Number(elem.dataset.id);
                    elem.classList.add(animals.some(animal => animal.id == elemAnimalId) ? 'selectable' : 'unselectable');
                });
            }
            
            public endCardSelection() {
                (Array.from(document.getElementsByClassName('animal-card')) as HTMLDivElement[]).forEach(elem => {
                    elem.classList.remove('selectable');
                    elem.classList.remove('unselectable');
                });
            }*/
        }