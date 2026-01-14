const RANKS = [null, 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_COLOR = { '♠': 'black', '♣': 'black', '♥': 'red', '♦': 'red' };

let moveCount = 0;
let deck = []; //kupček
let tableau = [[], [], [], [], [], [], []]; //karte vpodi v stolpcih
let foundations = [[], [], [], []]; //miza
let stock = [];
let waste = [];
let dragData = null;


function makeDeck() {
    const d = [];
    for (const s of SUITS) {
        for (let r = 1; r <= 13; r++) {//tok k je različnih kart
            d.push({ rank: r, suit: s, faceUp: false });//za vsak znak in vsak rang (1–13) nrdi objekt
        }
    }
    return d;//52 kart (nrdi vse karte)
}

//premeša vse karte
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
}

function newGame() {
    deck = makeDeck();
    shuffle(deck); //vedno nou, vsako igro
    moveCount = 0;

    tableau = [[], [], [], [], [], [], []];
    foundations = [[], [], [], []];
    stock = [];
    waste = [];

    let pos = 0;

    for (let i = 0; i < 7; i++) { //kle jih postau u stolpce
        for (let j = 0; j < i; j++) { //to je iz interneta
            const c = deck[pos++];
            c.faceUp = false;
            tableau[i].push(c);
        }
        const c = deck[pos++];
        c.faceUp = true;
        tableau[i].push(c);
    }

    stock = deck.slice(pos); //kr ustane -> kupčk na stran

    render();
    setStatus("Nova igra!");
    document.getElementById('gameOver').style.display = 'none';
}

function setStatus(s) {//posodobi št.potez in status
    document.getElementById('moveCount').textContent = moveCount;
    document.getElementById('status').textContent = s;
}

function render() {//kaže oz izriše use
    const tableauEl = document.getElementById('tableau');
    tableauEl.innerHTML = '';//pobriše najprej use

    tableau.forEach((pile, pi) => { //pile:dejasnki sezn.kart, pi:id stolpca
        const pileEl = document.createElement('div');
        pileEl.className = 'pile';

        if (pile.length === 0) {//če je stolpec prazn nariš prazn pole, kle gre lah sam kralj
            const emptySlot = document.createElement('div');
            emptySlot.className = 'card-slot';
            emptySlot.style.height = '130px';
            pileEl.appendChild(emptySlot);
        }

        pile.forEach((c, ci) => {//za vsako karto v stolpcu nariše htmlelement karte
            const cardEl = document.createElement('div');
            cardEl.className = 'card ' + (c.faceUp ? '' : 'back');
            cardEl.style.top = (ci * 30) + 'px';

            if (c.faceUp) { //če se karta obrne gor, nariše rang in znak barve
                cardEl.innerHTML = `
                    <div class="rank ${SUIT_COLOR[c.suit]}">${RANKS[c.rank]}</div>
                    <div class="suit ${SUIT_COLOR[c.suit]}">${c.suit}</div>
                    <div class="top-right ${SUIT_COLOR[c.suit]}">${c.suit}</div>`;
                cardEl.draggable = true;
                cardEl.addEventListener('dragstart', e => onDragStart(e, pi, ci));
            } else {//čene hrbtno stran nariš
                cardEl.className = 'card back';//to dvoje gre tud vn
                cardEl.innerHTML = '';
                //cardEl.style.backgroundImage = 'url("ozadje.png")';
                //cardEl.style.backgroundSize = 'cover';
                //cardEl.style.backgroundPosition = 'center';
                //cardEl.style.backgroundRepeat = 'no-repeat';
            }

            pileEl.appendChild(cardEl);
        });

        pileEl.addEventListener('dragover', e => e.preventDefault());// omogoč da spušča
        pileEl.addEventListener('drop', e => onDropPile(e, pi));// log. za odlaganje

        tableauEl.appendChild(pileEl); //doda stolpc v dom
    });

    const fSlots = document.querySelectorAll('.foundation-slot'); //riše mizo, najprej jo zbriše in šenkrat nariše
    fSlots.forEach((slot, i) => {
        slot.innerHTML = '';
        const top = foundations[i][foundations[i].length - 1];//če miza ni prazna pokaž tavrhno vvvvvvvv
        
        if (top) {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.style.position = 'relative';
            cardEl.innerHTML = `
                <div class="rank ${SUIT_COLOR[top.suit]}">${RANKS[top.rank]}</div>
                <div class="suit ${SUIT_COLOR[top.suit]}">${top.suit}</div>
                <div class="top-right ${SUIT_COLOR[top.suit]}">${top.suit}</div>`;
            slot.appendChild(cardEl);
        } else {                                            //čene oznake "X"
            const label = document.createElement('div');
            label.className = 'empty-label';
            label.textContent = 'X' + (i + 1);
            slot.appendChild(label);
        }
        //drag in drop dog.
        slot.addEventListener('dragover', e => e.preventDefault());
        slot.addEventListener('drop', e => onDropFoundation(e, i));
    });
    //niriše kupček---------------------------------
    const stockEl = document.getElementById('stock');
    stockEl.innerHTML = '';
    
    if (stock.length > 0) {
        const c = document.createElement('div');
        c.className = 'card back';
        c.style.position = 'relative';
        //c.innerHTML = '';
        stockEl.appendChild(c);
    } else if (waste.length > 0) {
        const label = document.createElement('div');
        label.className = 'empty-label';
        label.textContent = 'RESETIRAJ';
        stockEl.appendChild(label);
    } else {
        const label = document.createElement('div'); //oba prazna
        label.className = 'empty-label';
        label.textContent = 'STOCK';
        stockEl.appendChild(label);
    }//---------------------------------
    //nariše waste kupček*****************
    const wasteEl = document.getElementById('waste');
    wasteEl.innerHTML = '';
    
    if (waste.length > 0) {
        const c = waste[waste.length - 1];
        const cEl = document.createElement('div');
        cEl.className = 'card';
        cEl.style.position = 'relative';
        cEl.innerHTML = `
            <div class="rank ${SUIT_COLOR[c.suit]}">${RANKS[c.rank]}</div>
            <div class="suit ${SUIT_COLOR[c.suit]}">${c.suit}</div>
            <div class="top-right ${SUIT_COLOR[c.suit]}">${c.suit}</div>`;
        cEl.draggable = true;
        cEl.addEventListener('dragstart', e => onDragStartWaste(e));
        wasteEl.appendChild(cEl);
    }//*************************************************
}
//zčne vlečt karte iz stolpcou spod
function onDragStart(e, pi, ci) {
    dragData = { from: 'tableau', pile: pi, index: ci };
    e.dataTransfer.effectAllowed = 'move';
}
//ist sam iz wasta
function onDragStartWaste(e) {
    dragData = { from: 'waste' };
    e.dataTransfer.effectAllowed = 'move';
}
//spust karte na en stolpec, al T al F
function onDropPile(e, pi) {
    e.preventDefault();
    if (!dragData) return;

    if (dragData.from === 'tableau') {
        const fromPile = tableau[dragData.pile];
        const group = fromPile.slice(dragData.index);
        const bottom = group[0];
        const toPile = tableau[pi];
        const top = toPile[toPile.length - 1];

        if (!top) {
            if (bottom.rank === 13) {
                moveGroup(dragData.pile, dragData.index, pi);
                setStatus("Kralj premaknjen");
            } else {
                setStatus("Le kralj gre lahko na prazen stolpec");
            }
        } else if (top.rank === bottom.rank + 1 && SUIT_COLOR[top.suit] !== SUIT_COLOR[bottom.suit]) {
            moveGroup(dragData.pile, dragData.index, pi);
            setStatus("Premaknjen stolpec");
        } else {
            setStatus("Nedovoljena poteza");
        }
    } else if (dragData.from === 'waste') {
        const card = waste[waste.length - 1];
        const toPile = tableau[pi];
        const top = toPile[toPile.length - 1];

        if (!top) {
            if (card.rank === 13) {
                waste.pop();
                card.faceUp = true; //}}}<<<<<<<<<<<<
                tableau[pi].push(card);
                moveCount++;
                setStatus("Kralj iz kupčka");
                render();
            } else {
                setStatus("Le kralj gre lahko na prazen stolpec");
            }
        } else if (top.rank === card.rank + 1 && SUIT_COLOR[top.suit] !== SUIT_COLOR[card.suit]) {
            waste.pop();
            card.faceUp = true; //}}}<<<<<<<<<<<<
            tableau[pi].push(card);
            moveCount++;
            setStatus("Karta iz kupčka");
            render();
        } else {
            setStatus("Nedovoljena poteza");
        }
    }
    dragData = null;
}

//spust karte na mizo
function onDropFoundation(e, fi) {
    e.preventDefault();
    if (!dragData) return;

    let card = null;
    let fromPile = null;
    let fromIndex = null;

    if (dragData.from === 'tableau') {
        fromPile = tableau[dragData.pile];
        fromIndex = dragData.index;
        card = fromPile[fromIndex];
        if (fromIndex !== fromPile.length - 1) {
            setStatus("Samo zgornja karta na mizo");
            dragData = null;
            return;
        }
    } else if (dragData.from === 'waste') {
        card = waste[waste.length - 1];
    }

    const topF = foundations[fi][foundations[fi].length - 1];

    if (!topF) {
        if (card.rank === 1) {
            moveToFoundation(card, fi);
        } else {
            setStatus("Le As lahko začne mizo");
        }
    } else if (topF.suit === card.suit && card.rank === topF.rank + 1) {
        moveToFoundation(card, fi);
    } else {
        setStatus("Napačna karta za mizo");
    }

    dragData = null;
}

//premikanje več kart med stolpci :P
function moveGroup(fromPi, fromIdx, toPi) {
    moveCount++;
    const group = tableau[fromPi].slice(fromIdx);
    tableau[fromPi] = tableau[fromPi].slice(0, fromIdx);
    tableau[toPi] = tableau[toPi].concat(group);

    const fromPile = tableau[fromPi];
    if (fromPile.length > 0) {
        const topCard = fromPile[fromPile.length - 1];
        if (!topCard.faceUp) topCard.faceUp = true;
    }

    render();
}

function moveToFoundation(card, fi) {
    if (dragData.from === 'waste') {
        waste.pop();
        
        foundations[fi].push(card);
    } else {
        tableau[dragData.pile].pop();
        foundations[fi].push(card);
        flipTop(dragData.pile);
    }
    moveCount++;
    setStatus("Premaknjeno na mizo");
    render();

    let total = 0;
    for (let f = 0; f < foundations.length; f++) {
        total += foundations[f].length;
    }
    if (total === 52) {
        setStatus("ZMAGA!!!!");
        document.getElementById('finalMoves').textContent = moveCount;
        document.getElementById('gameOver').style.display = 'block';
    }
}

function flipTop(pi) {// ubrne zgornjo karto v stolpcu, če je navzdol
    const pile = tableau[pi];
    if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
        pile[pile.length - 1].faceUp = true;
    }
}

function drawFromStock() {
    if (stock.length === 0 && waste.length > 0) {
        stock = waste.reverse();
        waste = [];
        moveCount++;
        setStatus("Kupček resetiran!");
        render();
    } else if (stock.length > 0) {
        waste.push(stock.pop());
        moveCount++;
        setStatus("Povlečena karta iz kupčka");
        render();
    }
}

document.getElementById('stock').addEventListener('click', drawFromStock);
document.getElementById('newBtn').addEventListener('click', newGame);

newGame();