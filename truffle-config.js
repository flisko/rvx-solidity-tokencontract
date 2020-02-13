module.exports = {
  networks: {
      development: {
          host: '192.168.1.115',
          port: 8545,
          network_id: '3',
          gas: 10000000,
          gasPrice: 180e9,
          // following address needed to be replaced with unlocked account on gwan node
          from: '0x14ef9a5100dc4dccda028fa4936e63e31c75c5e1'
      }
  },
  compilers: {
    solc: {
      version:"0.5.11",
      evmVersion:"byzantium",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200   // Optimize for how many times you intend to run the code
        }   // ex:  "0.4.20". (Default: Truffle's installed solc)
    }   
}
}

}