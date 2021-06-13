const request = require('request');
const CoinGecko = require('coingecko-api');
const { response } = require('express');
const CoinGeckoClient = new CoinGecko();

let coindata;
let sym_data = {};
let name_data = {};

const getData = async () => {
  coindata = await CoinGeckoClient.coins.list();
  coindata.data.map(el => {
    sym_data[el.symbol] = el.id;
    name_data[el.name] = el.id;
  });
}

getData();

const priceOfCryptohandler = async (entities) => {
  let response = {};
  if (entities['dataRequired:dataRequired'] == undefined) {
    responseLines = [
      "Hi there. Talk crypto to me.",
      "You can ask questions like:",
      "Tell me about binance coin",
      "What is the price of btc ?",
      "What is the market cap of zrx ?",
      "What is 24 hour high for bitcoin ?"
    ]

    response = {
      "text": responseLines.join('\n')
    };

    return response;
  }

  const dataRequired = entities['dataRequired:dataRequired'].map(el => {
    if (el.confidence >= 0.8) {
      return el.value;
    }
  });

  const cryptoSymbols = entities['cryptoSymbol:cryptoSymbol'].map(el => {
    if (el.confidence >= 0.7) {
      return el.value;
    }
  });

  if (cryptoSymbols.length < 1) {
      
    responseLines = [
      "Please send the query with the name of a valid coin to get price and other market data !!"
    ];

    response = {
      "text": responseLines.join('\n')
    };

    return response;
  }

  const queryTermList = ['current_price', 'market_cap', 'high_24h', 'low_24h', 'generic'];

  console.log("********************************Query Term*********************************");
  console.log(dataRequired[0]);

  if (queryTermList.indexOf(dataRequired[0]) != -1) {

    let coinId = cryptoSymbols.map(el => {
      const id = sym_data[el] || name_data[el];
      if(!id) {
        return 'NOT_FOUND_404';
      } else {
        return id;
      }
    });
    
    if(coinId.indexOf('NOT_FOUND_404') != -1) {
  
      responseLines = [
        `Could not find a coin with the symbol ${cryptoSymbols[coinId.indexOf('NOT_FOUND_404')]}`
      ];
      response = {
        "text": responseLines.join('\n')
      };
  
      return response;
    }

    const coin = await CoinGeckoClient.coins.fetch(coinId[0], {});

    if (dataRequired[0] == 'generic') {
      // add generic info for more than one coin in a query
      // this can be sent with joined by 'and'
      responseLines = [
        `Name: ${coin["data"]["id"]}`,
        `Learn more here: ${coin["data"]["links"]["homepage"][0]}`,
        `Market price (BTC): ${coin["data"]["market_data"]["current_price"]["btc"]}`,
        `Market price (USD): ${coin["data"]["market_data"]["current_price"]["usd"]}`,
        `24 hour high (BTC)/(USD): ${coin["data"]["market_data"]["high_24h"]["btc"]}/${coin["data"]["market_data"]["high_24h"]["usd"]}`,
        `24 hour low (BTC)/(USD): ${coin["data"]["market_data"]["low_24h"]["btc"]}/${coin["data"]["market_data"]["low_24h"]["usd"]}`
      ]
      response = {
        "text": responseLines.join('\n')
      };
  
      return response;
    }

    if (cryptoSymbols.length == 1) {
      
      responseLines = [
        `Name: ${coin["data"]["name"]}`,
        `Market price (BTC): ${coin["data"]["market_data"][dataRequired[0]]["btc"]}`,
        `Market price (USD): ${coin["data"]["market_data"][dataRequired[0]]["usd"]}`,
        `Know more about market trends at Coingecko: https://www.coingecko.com/en/coins/${coinId[0]}`
      ]
    } else {
      
      responseLines = [
        `Name: ${coin["data"]["name"]}`
      ]
      responseLines.push(cryptoSymbols.slice(1).map((el, index) => {
        return `Market price (${el}): ${coin["data"]["market_data"][dataRequired[0]][el]}`
      }));
      responseLines.push(`Know more about market trends at Coingecko: https://www.coingecko.com/en/coins/${coinId[0]}`)
    }
  } else {
    responseLines = [
      `Sorry we could not understand your query!! We have made a note of it and will be adding the support soon, if possible.`
    ]
  }

  response = {
    "text": responseLines.join('\n')
  };

  return response;

}

const processNLP = async (nlp) => {

  const possibleIntents = nlp.intents.map(el => {
    if (el.confidence >= 0.8)
      return el;
  });
  
  possibleIntents.sort(function(a, b) {
    return (-1 * (a.confidence-b.confidence));
  })

  if (possibleIntents[0].name === 'priceOfCrypto') {
    return await priceOfCryptohandler(nlp.entities);
  }

}

// Handles messages events
exports.handleMessage = async (sender_psid, received_message) => {
  let response;
  
  console.log(received_message.nlp.entities);
  // Check if the message contains text
  if (received_message.text) {

    response = await processNLP(received_message.nlp);

        // responseData = [
        //   `Name: ${coin["data"]["id"]}`,
        //   `Homepage: ${coin["data"]["links"]["homepage"][0]}`,
        //   `Market price (BTC): ${coin["data"]["market_data"]["current_price"]["btc"]}`,
        //   `Market price (USD): ${coin["data"]["market_data"]["current_price"]["usd"]}`,
        //   `24 hour high (BTC)/(USD): ${coin["data"]["market_data"]["high_24h"]["btc"]}/${coin["data"]["market_data"]["high_24h"]["usd"]}`,
        //   `24 hour low (BTC)/(USD): ${coin["data"]["market_data"]["low_24h"]["btc"]}/${coin["data"]["market_data"]["low_24h"]["usd"]}`
        // ]

        // response = {
        //   "text": responseData.join('\n')
        // }
        
  }  
  // Sends the response message
  console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
  console.log(response);
  console.log("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
  this.callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
exports.handlePostback = (sender_psid, received_postback) => {

}

// Sends response messages via the Send API
exports.callSendAPI = (sender_psid, response) => {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}