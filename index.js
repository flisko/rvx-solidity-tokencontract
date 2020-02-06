var express = require("express");
var app = express();
var cors = require("cors");
var Web3 = require("web3");
const ethers = require('ethers');
var HookedWeb3Provider = require("hooked-web3-provider");
var lightwallet = require("eth-lightwallet");
var config = require("./config.json");
const mkdirp = require("mkdirp");
const level = require("level");
const contract_ABI = require("./contract").contract_ABI;
const contract_ADDRESS = require("./contract").contract_address;

mkdirp.sync(require("os").homedir() + "/.ethfaucetssl/queue");
mkdirp.sync(require("os").homedir() + "/.ethfaucetssl/exceptions");
const dbQueue = level(require("os").homedir() + "/.ethfaucetssl/queue");
const dbExceptions = level(
    require("os").homedir() + "/.ethfaucetssl/exceptions"
);
const greylistduration = 1000 * 60 * 60 * 24;

var faucet_keystore = JSON.stringify(require("./wallet.json"));

let wallet = new ethers.Wallet(config.privatekey);
console.log(wallet.address);



var secretSeed = lightwallet.keystore.generateRandomSeed();
let network = {
    chainId: 3,
    name: "testnet"
}
let httpProvider = new ethers.providers.JsonRpcProvider();

let walletWithProvider = new ethers.Wallet(config.privatekey, httpProvider);
// check for valid Eth address
function isAddress(address) {
    return /^(0x)?[0-9a-f]{40}$/i.test(address);
}

// Add 0x to address
function fixaddress(address) {
    // Strip all spaces
    address = address.replace(" ", "");
    // Address lowercase
    address = address.toLowerCase();
    //console.log("Fix address", address);
    if (!strStartsWith(address, "0x")) {
        return "0x" + address;
    }
    return address;
}

function strStartsWith(str, prefix) {
    return str.indexOf(prefix) === 0;
}
var token
var account;
var web3;
var privatekey;
let contract;
let contractWithSigner;
contractWithSigner = new ethers.Contract(contract_ADDRESS, contract_ABI, wallet);
contract = new ethers.Contract(contract_ADDRESS, contract_ABI, httpProvider);

lightwallet.keystore.deriveKeyFromPassword(config.walletpwd, function(
    err,
    pwDerivedKey
) {
    var keystore = new lightwallet.keystore.deserialize(faucet_keystore);

    console.log("connecting to ETH node: ", config.web3.host);

    var web3Provider = new HookedWeb3Provider({
        host: config.web3.host,
        transaction_signer: keystore
    });

    web3 = new Web3();

    web3.setProvider(web3Provider);

    keystore.passwordProvider = function(callback) {
        callback(null, config.walletpwd);
    };
    console.log("Wallet initted addr=" + keystore.getAddresses()[0]);

    account = fixaddress(keystore.getAddresses()[0]);
    console.log("Address:" + account);
    token = new web3.eth.Contract(contract_ABI, contract_ADDRESS, {
        defaultAccount: account,
        defaultGasPrice: '10000000000'
    });




    //start webserver...
    app.listen(config.httpport, function() {
        console.log("faucet listening on port ", config.httpport);
    });

    // const options = {
    // 	cert: fs.readFileSync('./sslcert/fullchain.pem'),
    // 	key: fs.readFileSync('./sslcert/privkey.pem')
    // };

    // https.createServer(options, app).listen(443);
});


// Get RVX token balance in operator wallet
async function getFaucetBalance(denomination) {
    let tokenBalance = await Promise.all([
        token.methods.balanceOf(account).call()
    ]);
    console.log("token balance: " + tokenBalance);
    let balance = (tokenBalance / 1e18);
    return balance;
}

app.use(cors());

// frontend app is served from here
app.use(express.static("static/build"));



app.get("/faucetenabled", async (req, res) => {
    let isfaucetenabled = await Promise.all([
        token.methods.faucet().call()
    ]);
    res.status(200).json({
        faucetenabled: isfaucetenabled
    });
})

app.get("/operatoraddress", async (req, res) => {
    let operatorAddress = await Promise.all([
        token.methods.operator().call(),
        token.methods._owner().call()

    ]);
    console.log("Operator address");
    console.log(operatorAddress[0]);
    console.log(operatorAddress[1]);
    res.status(200).json({
        operatoraddress: operatorAddress[0],
        owneraddress: operatorAddress[1]
    });
})

app.get("/faucettoggle", async (req, res) => {

    doFaucetToggle()
        .then(txhash => {
            Promise.all([]).then(() => {
                var reply = {
                    txhash: txhash
                };
                return res.status(200).json(reply);
            });
        })
        .catch(e => {
            return res.status(500).json({
                err: e.message
            });
        });
})
setTimeout(() => {
    getTokenAmount();
}, 200)
app.get("/changetokenamount/:amount", async (req, res) => {
    var amount = parseInt(req.params.amount);
    config.payoutamountinether = amount;
    doChangeToken(amount)
        .then(txhash => {
            Promise.all([]).then(() => {
                var reply = {
                    txhash: txhash
                };
                return res.status(200).json(reply);
            });
        })
        .catch(e => {
            return res.status(500).json({
                err: e.message
            });
        });


})
async function getTokenAmount() {
    let tokenAmount = await Promise.all([
        token.methods.testtokenAmount().call()
    ]);

    let amount = parseInt(tokenAmount) / 1e18;
    config.payoutamountinether = amount;
    return;
}

async function ChangeToken(tokenamount, cb) {

    var mydata = token.methods.changeTestTokenAmount(tokenamount).encodeABI();
    var number;
    web3.eth.getTransactionCount("0x823fbd6c41ff917b78b88fee561291fd750ddfcd").then(num => {
        number = num + 1;
    });
    const options = {
        Txtype: "0x01",
        nonce: web3.utils.numberToHex(number),
        gasPrice: "0x2a600b9c00",
        to: "0x97626dA35b3290c9C86Df26656eDE4F56c60d52B",
        value: "0x00",
        data: mydata,
        chainId: 3
    }
    walletWithProvider.sendTransaction(options).then((tx) => {
        let hash = tx.hash;
        let error;
        tx.wait().then((txrect) => {
            if (txrect.status == 1) {
                error = false;
            } else error = true;
            return cb(error, hash);
        });

    });

}

function doChangeToken(amount) {
    return new Promise((resolve, reject) => {
        ChangeToken(amount, (err, txhash) => {
            if (err) {
                resolve("0x0");
            } else {
                resolve(txhash);
            }
        });
    });
}
async function toggleFaucet(cb) {

    var mydata = token.methods.toggleFaucet().encodeABI();
    var number;
    web3.eth.getTransactionCount("0x823fbd6c41ff917b78b88fee561291fd750ddfcd").then(num => {
        number = num + 1;
    })
    const options = {
        Txtype: "0x01",
        nonce: web3.utils.numberToHex(number),
        gasPrice: "0x2a600b9c00",
        to: "0x97626dA35b3290c9C86Df26656eDE4F56c60d52B",
        value: "0x00",
        data: mydata,
        chainId: 3
    }


    walletWithProvider.sendTransaction(options).then((tx) => {
        let hash = tx.hash;
        let error;
        tx.wait().then((txrect) => {
            if (txrect.status == 1) {
                error = false;
            } else error = true;
            return cb(error, hash);
        });

    });
}

function doFaucetToggle() {
    return new Promise((resolve, reject) => {
        toggleFaucet((err, txhash) => {
            if (err) {
                resolve("0x0");
            } else {
                resolve(txhash);
            }
        });
    });
}


// get current faucet info
app.get("/faucetinfo", async (req, res) => {
    var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    console.log("client IP=", ip);
    try {
        etherbalance = await getFaucetBalance();
        console.log(etherbalance);
    } catch (e) {
        console.log(e);
    }
    res.status(200).json({
        account: account,
        balance: etherbalance,
        etherscanroot: config.etherscanroot,
        payoutfrequencyinsec: config.payoutfrequencyinsec,
        payoutamountinether: config.payoutamountinether,
        queuesize: config.queuesize,
        queuename: "queue"
    });
});

app.get("/blacklist/:address", function(req, res) {
    var address = fixaddress(req.params.address);
    if (isAddress(address)) {
        setException(address, "blacklist").then(() => {
            res.status(200).json({
                msg: "address added to blacklist"
            });
        });
    } else {
        return res.status(400).json({
            message: "the address is invalid"
        });
    }
});

app.get("/q", function(req, res) {
    getQueue().then(q => {
        res.status(200).json(q);
    });
});

function getQueue() {
    var q = [];
    return new Promise((resolve, reject) => {
        var stream = dbQueue
            .createReadStream({
                keys: true,
                values: true
            })
            .on("data", item => {
                q.push(item);
            })
            .on("end", function() {
                resolve(q);
            });
    });
}

// queue monitor
setInterval(() => {
    iterateQueue();
    cleanupException();
}, config.payoutfrequencyinsec * 1000);

var lastIteration = 0;

function canDonateNow() {
    return new Promise((resolve, reject) => {
        const res = lastIteration < Date.now() - config.payoutfrequencyinsec * 1000;
        if (!res) {
            resolve(false);
        } else {
            queueLength().then(length => {
                resolve(length == 0);
            });
        }
    });
}

function setDonatedNow() {
    lastIteration = Date.now();
    console.log("last donation:", lastIteration);
}

function doDonation(address) {
    return new Promise((resolve, reject) => {
        setDonatedNow();
        donate(address, (err, txhash) => {


            if (err) {
                console.log("error: " + err);
                resolve("0x0");
            } else {
                console.log("txhash: " + txhash);
                resolve(txhash);
            }
        });
    });
}

function queueLength() {
    return new Promise((resolve, reject) => {
        var count = 0;
        dbQueue
            .createReadStream()
            .on("data", function(data) {
                count++;
            })
            .on("error", function(err) {
                reject(err);
            })
            .on("end", function() {
                resolve(count);
            });
    });
}

function exceptionsLength() {
    return new Promise((resolve, reject) => {
        var lengths = {};
        dbExceptions
            .createReadStream({
                keys: true,
                values: true
            })
            .on("data", function(item) {
                var data = JSON.parse(item.value);
                if (!lengths[data.reason]) {
                    lengths[data.reason] = 0;
                }
                lengths[data.reason]++;
            })
            .on("error", function(err) {
                reject(err);
            })
            .on("end", function() {
                resolve(lengths);
            });
    });
}

function enqueueRequest(address) {
    return new Promise((resolve, reject) => {
        const key = Date.now() + "-" + address;
        dbQueue.put(
            key,
            JSON.stringify({
                created: Date.now(),
                address: address
            }),
            function(err) {
                if (err) {
                    return reject(err);
                }
                queueLength().then(length => {
                    // calculated estimated payout date
                    return resolve(
                        Date.now() + length * config.payoutfrequencyinsec * 1000
                    );
                });
            }
        );
    });
}

function iterateQueue() {
    return new Promise((resolve, reject) => {
        // make sure faucet does not drip too fast.
        if (canDonateNow()) {
            var stream = dbQueue
                .createReadStream({
                    keys: true,
                    values: true
                })
                .on("data", item => {
                    console.log("item:", item);
                    stream.destroy();
                    dbQueue.del(item.key, err => {
                        if (err) {
                            ///
                        }
                        var data = JSON.parse(item.value);
                        console.log("DONATE TO ", data.address);
                        setDonatedNow();
                        doDonation(data.address).then(txhash => {
                            console.log("sent ETH to ", data.address);
                            return resolve();
                        });
                    });
                });
        } else {
            return resolve();
        }
    });
}

// lookup if there is an exception made for this address
function getException(address) {
    return new Promise((resolve, reject) => {
        dbExceptions.get(address, function(err, value) {
            if (err) {
                if (err.notFound) {
                    // handle a 'NotFoundError' here
                    return resolve();
                }
                // I/O or other error, pass it up the callback chain
                return reject(err);
            }
            value = JSON.parse(value);
            resolve(value);
        });
    });
}

// set an exception for this address ( greylist / blacklist )
function setException(address, reason) {
    return new Promise((resolve, reject) => {
        dbExceptions.put(
            address,
            JSON.stringify({
                created: Date.now(),
                reason: reason,
                address: address
            }),
            function(err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            }
        );
    });
}

// check if there are items in the exception queue that need to be cleaned up.
function cleanupException() {
    var stream = dbExceptions
        .createReadStream({
            keys: true,
            values: true
        })
        .on("data", item => {
            const value = JSON.parse(item.value);
            if (value.reason === "greylist") {
                if (value.created < Date.now() - greylistduration) {
                    dbExceptions.del(item.key, err => {
                        console.log("removed ", item.key, "from greylist");
                    });
                }
            }
        });
}

// try to add an address to the donation queue
app.get("/donate/:address", function(req, res) {
    var ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    ip = ip.replace(/\./g, "_");
    var address = fixaddress(req.params.address);
    if (isAddress(address)) {
        const key = Date.now() + "-" + address;
        const val = {
            address: address
        };
        Promise.all([getException(address), getException(ip)]).then(
            ([addressException, ipException]) => {
                var exception = addressException || ipException;
                if (exception) {
                    if (exception.reason === "greylist") {
                        console.log(exception.address, "is on the greylist");
                        return res.status(403).json({
                            address: exception.address,
                            message: "you are greylisted",
                            duration: exception.created + greylistduration - Date.now()
                        });
                    }
                    if (exception.reason === "blacklist") {
                        console.log(exception.address, "is on the blacklist");
                        return res.status(403).json({
                            address: address,
                            message: "you are blacklisted"
                        });
                    }
                } else {
                    canDonateNow().then(canDonate => {
                        if (canDonate) {
                            // donate right away
                            console.log("donating now to:", address);
                            doDonation(address)
                                .then(txhash => {
                                    Promise.all([
                                        //setException(ip, "greylist"),
                                        setException(address, "greylist")
                                    ]).then(() => {
                                        var reply = {
                                            address: address,
                                            txhash: txhash,
                                            amount: config.payoutamountinether * 1e18
                                        };
                                        return res.status(200).json(reply);
                                    });
                                })
                                .catch(e => {
                                    return res.status(500).json({
                                        err: e.message
                                    });
                                });
                        } else {
                            // queue item
                            console.log("adding address to queue:", address);
                            queueLength().then(length => {
                                if (length < config.queuesize) {
                                    enqueueRequest(address).then(paydate => {
                                        console.log("request queued for", address);
                                        Promise.all([
                                            setException(ip, "greylist"),
                                            setException(address, "greylist")
                                        ]).then(() => {
                                            var queueitem = {
                                                paydate: paydate,
                                                address: address,
                                                amount: config.payoutamountinether * 1e18
                                            };
                                            return res.status(200).json(queueitem);
                                        });
                                    });
                                } else {
                                    return res.status(403).json({
                                        msg: "queue is full"
                                    });
                                }
                            });
                        }
                    });
                }
            }
        );
    } else {
        return res.status(400).json({
            message: "the address is invalid"
        });
    }
});

async function donate(to, cb) {
    var mydata = token.methods.transferTestToken(to).encodeABI();
    //console.log(mydata);
    //console.log("to:"+to);
    var number;
    web3.eth.getTransactionCount("0x823fbd6c41ff917b78b88fee561291fd750ddfcd").then(num => {
        number = num + 1;
    })
    const options = {
        Txtype: "0x01",
        nonce: web3.utils.numberToHex(number),
        gasPrice: "0x2a600b9c00",
        to: "0x97626dA35b3290c9C86Df26656eDE4F56c60d52B",
        value: "0x00",
        data: mydata,
        chainId: 3
    }

    walletWithProvider.sendTransaction(options).then((tx) => {
        let hash = tx.hash;
        let error;
        tx.wait().then((txrect) => {
            if (txrect.status == 1) {
                error = false;
            } else error = true;
            return cb(error, hash);
        });

    });

}