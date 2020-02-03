module.exports = {
  networks: {
      development: {
          host: 'localhost',
          port: 8545,
          network_id: '*',
          gas: 4000000,
          gasPrice: 180e9,
          // following address needed to be replaced with unlocked account on gwan node
          from: '0xDD24b8551e1547cE0cb1591025a3cE0A23d4cb43'
      }
  },
  compilers: {
    solc: {
      version:"0.5.11"  // ex:  "0.4.20". (Default: Truffle's installed solc)
    }
}
}