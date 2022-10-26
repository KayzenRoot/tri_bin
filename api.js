const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');

const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;
const apiUrl = process.env.API_URL;

//======================================================================
// Função para COMPRA

async function newOrderBuy(symbol, quoteOrderQty, side = 'BUY', type = 'MARKET') {
    const data = { symbol, side, type, quoteOrderQty }; 
    return privateCall('/v3/order', data, 'POST');
}

async function newOrderBuy2(symbol, side = 'BUY', type = 'MARKET') {
    const data = { symbol, side, type }; 
    return privateCall('/v3/order', data, 'POST');
}

//======================================================================
// Função para VENDA

async function newOrderSell(symbol, quantity, side = 'SELL', type = 'MARKET') {
    const data = { symbol, side, type, quantity }; 
    return privateCall('/v3/order', data, 'POST');
}

//======================================================================
// Função para buscar informações privadas da Binance ( Função de uso interno na api.js)

async function privateCall(path, data = {}, method = 'GET') {
    const timestamp = Date.now();
    const recvWindow = 59000;
    const signature = crypto.createHmac('sha256', apiSecret)
                    .update(`${querystring.stringify({...data, recvWindow, timestamp})}`)
                    .digest('hex');

    const newData = { ...data, recvWindow, timestamp, signature };
    const qs = `?${querystring.stringify(newData)}`;
    try {
        const result = await axios( {
            method,
            url: `${apiUrl}${path}${qs}`,
            headers: { 'X-MBX-APIKEY': apiKey }
        })
        return result.data;
    } catch (err) {
        console.log(err);
    }
}

//======================================================================
// Função para buscar informações publicas da Binance ( Função de uso interno na api.js)

async function publicCall(path, data, method = 'GET') {  
    try {
        const qs = data ? `?${querystring.stringify(data)}` : '';
        const result = await axios({
            method,
            url: `${process.env.API_URL}${path}${qs}`
        })
        return result.data;
    } catch (err) {
        console.log(err);
    }
}

//========================================================================
// Função para fins de teste - return função generica - manda o horario da binance pra cá 

async function time() {
    return publicCall('/v3/time');
}

//========================================================================
//Função para monitorar o mercado com a moeda detrminada pelo symbol informado

async function depth(symbol = 'BTCUSDT', limit = 15) {
    return publicCall('/v3/depth', {symbol, limit});
}

//========================================================================
//Informações da conta na Binance ( carteira )

async function accountInfo() {
    return privateCall('/v3/account');
}

//=========================================================================
//Exporta as funções da api.js para serem usadas no index.js




module.exports = {
    time,
    depth,
    accountInfo,
    newOrderBuy,
    newOrderSell,
    newOrderBuy2 
}