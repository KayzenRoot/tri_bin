require('dotenv-safe').config();

const api= require('./api');

setInterval(async () => {
 
    let carteira = {};
    carteira =  await api.accountInfo();
    let carteiraUSDT = carteira.balances[11];
   console.log(carteiraUSDT);
    console.log(carteira);

}, 1000);



