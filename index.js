require('dotenv-safe').config();

const api= require('./api');

const axios = require("axios"); // carregar o axios
const QUOTE = 'USDT';
const AMOUNT = 110;
const PROFITABILITY = 1.0035;

const WebSocket = require("ws");
const ws = new WebSocket("wss://stream.binance.com:9443/ws/!bookTicker");

//======================================================================
// Guarda as informações de preço enviadas pela binance

const BOOK = {};

ws.onmessage = async (event) => {
    const obj = JSON.parse(event.data);
    BOOK[obj.s] = { ask: parseFloat(obj.a), bid: parseFloat(obj.b) };
}

//======================================================================

async function exchangeInfo() {
    const response = await axios.get("https://api.binance.com/api/v3/exchangeInfo");  // chamar a api da binance ultilizando o axios 
    const symbols = response.data.symbols.filter( s => s.status === 'TRADING');  // filtra as informações puxadas da binance ... onde só quero as 3 informações abaixo na array 
    return symbols.map( s => {
        return {
            symbol: s.symbol,
            base: s.baseAsset,
            quote: s.quoteAsset
        }
    })
}

//========================================================================
//Descobrir quais são as triangulações possiveis usando o QUOTE

function getBuyBuySell(buySymbols, allSymbols) {
    const buyBuySell = [];

    for ( let i=0; i < buySymbols.length; i++) {
        const buy1 = buySymbols[i];

        const right = allSymbols.filter( s => s.quote === buy1.base);

        for ( let j=0; j < right.length; j++) {
            const buy2 = right[j];

            const sell1 = allSymbols.find( s => s.base === buy2.base && s.quote === buy1.quote);
            if(!sell1) continue;

            buyBuySell.push({ buy1, buy2, sell1});
        };            
    }
    return buyBuySell;
}
/*
function getBuySellSell(buySymbols, allSymbols) {
    const buySellSell = [];

    for ( let a=0; a < buySymbols.length; a++) {
        const b1 = buySymbols[a];

        const right = allSymbols.filter( s => s.base === b1.base && s.quote !== b1.quote);

        for ( let v=0; v < right.length; v++) {
            const v1 = right[v];

            const v2 = allSymbols.find( s => s.base === v1.quote && s.quote === b1.quote);
            if(!v2) continue;

            buySellSell.push({ b1, v1, v2});
        };
    }
    return buySellSell;
}
*/
//========================================================================
// Função para consultar se a triangulação vale a pena se da lucro ou não 

async function processBuyBuySell(buyBuySell) {
    for ( let i=0; i < buyBuySell.length; i++) {
        
        const candidate = buyBuySell[i];

        let priceBuy1 = BOOK[candidate.buy1.symbol];
        if (!priceBuy1) continue;
        priceBuy1 = priceBuy1.ask;
        
        let priceBuy2 = BOOK[candidate.buy2.symbol];
        if (!priceBuy2) continue;
        priceBuy2 = priceBuy2.ask;        

        let priceSell1 = BOOK[candidate.sell1.symbol];
        if (!priceSell1) continue;
        priceSell1 = priceSell1.bid;      

        const crossRate = (1/priceBuy1) * (1/priceBuy2) * priceSell1;
        if ( crossRate > PROFITABILITY) {                  

            console.log(`==============================================================================================`);
            
            console.log(`BBS - Oportunidade em: Compra --> ${candidate.buy1.symbol} Compra --> ${candidate.buy2.symbol} Venda --> ${candidate.sell1.symbol} = ${crossRate.toFixed(4)}`);
            let carteira = {};
            carteira =  await api.accountInfo();
            let carteiraUSDT = carteira.balances[11];
            console.log( `Investindo ${AMOUNT} ${QUOTE}, retorna ${((AMOUNT / priceBuy1) / priceBuy2) * priceSell1} ${QUOTE}`);             
                      
            console.log(carteiraUSDT); 
            let s1 = candidate.buy1.symbol;
            let buyOrder = await api.newOrderBuy(s1, AMOUNT);
            console.log(`Comprando ${candidate.buy1.symbol}`);
            console.log(`ID da Ordem:  ${buyOrder.orderId}`);
            console.log(`Status:  ${buyOrder.status}`);       
            console.log(`==============================================================================================`);      

            let s2 = candidate.buy2.symbol;
            let buyOrder2 = await api.newOrderBuy(s2, buyOrder.executedQty);
            console.log(`Comprando ${candidate.buy2.symbol}`);
            console.log(`ID da Ordem:  ${buyOrder2.orderId}`);
            console.log(`Status:  ${buyOrder2.status}`);            
            console.log(`==============================================================================================`);                   
     
            let s3 = candidate.sell1.symbol;
            let sellOrder = await api.newOrderSell(s3, buyOrder2.executedQty, 'SELL', 'MARKET');
            console.log(`Vendendo ${candidate.sell1.symbol}`);
            console.log(`ID da Ordem:  ${sellOrder.orderId}`);
            console.log(`Status:  ${sellOrder.status}`);                
            console.log(`==============================================================================================`);
        }           
    }
}
/*
async function processBuySellSell(buySellSell) {
    for ( let a=0; a < buySellSell.length; a++) {
        const candidate1 = buySellSell[a];

        let priceB1 = BOOK[candidate1.b1.symbol];
        if (!priceB1) continue;
        priceB1 = priceB1.ask;  

        let priceV1 = BOOK[candidate1.v1.symbol];
        if (!priceV1) continue;
        priceV1 = priceV1.bid;

        let priceV2 = BOOK[candidate1.v2.symbol];
        if (!priceV2) continue;
        priceV2 = priceV2.bid;         

        const crossRateV = (1/priceB1) * priceV1 * priceV2;
        if ( crossRateV > PROFITABILITY) {

            console.log(`==============================================================================================`);
       
            console.log(`BSS - Oportunidade em ${candidate1.b1.symbol} > ${candidate1.v1.symbol} > ${candidate1.v2.symbol} = ${crossRateV}`);
            let carteiraV1 = {};
            carteiraV1 =  await api.accountInfo();
            let carteiraUSDTv1 = carteiraV1.balances[11];
            console.log( `Investindo ${AMOUNT} ${QUOTE}, retorna ${(AMOUNT / priceB1) * priceV1 * priceV2} ${QUOTE}`);

            console.log(carteiraUSDTv1);
            let buyOrder3 = await api.newOrderBuy(candidate1.b1.symbol, AMOUNT);
            console.log(`Comprando ${candidate1.b1.symbol}`);
            console.log(`ID da Ordem:  ${buyOrder3.orderId}`);
            console.log(`Status:  ${buyOrder3.status}`);
            console.log(`==============================================================================================`);

            let sellOrder2 = await api.newOrderSell(candidate1.v1.symbol, buyOrder3.executedQty, 'SELL', 'MARKET');
            console.log(`Vendendo ${candidate1.v1.symbol}`);
            console.log(`ID da Ordem:  ${sellOrder2.orderId}`);
            console.log(`Status:  ${sellOrder2.status}`);
            console.log(`==============================================================================================`);
                  
            let sellOrder3 = await api.newOrderSell(candidate1.v2.symbol, sellOrder2.executedQty, 'SELL', 'MARKET');
            console.log(`Vendendo ${candidate1.v2.symbol}`);
            console.log(`ID da Ordem:  ${sellOrder3.orderId}`);
            console.log(`Status:  ${sellOrder3.status}`);         
            console.log(`==============================================================================================`);       
        }
    }
}
*/
//=========================================================================

async function statusKo() {
    const allSymbols = await exchangeInfo();
    console.log("Existem " + allSymbols.length + " pares sendo negociados.");

    const buySymbols = allSymbols.filter( s => s.quote === QUOTE);

    const buyBuySell = getBuyBuySell(buySymbols, allSymbols);
    console.log("Existem " + buyBuySell.length + " pares BBS.");
/*
    const buySellSell = getBuySellSell(buySymbols, allSymbols);
    console.log("Existem " + buySellSell.length + " pares BSS.");
*/
    setInterval(() => {
        processBuyBuySell(buyBuySell);
  //      processBuySellSell(buySellSell);
    }, process.env.CRAWLER_INTERVAL);    
}

statusKo();