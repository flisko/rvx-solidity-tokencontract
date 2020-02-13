var RVXToken = artifacts.require("./RVXToken.sol");
var MultiSigWallet = artifacts.require("./MultiSigWallet.sol");
module.exports = function(deployer) {
    deployer.deploy(RVXToken,'0x07dee23b955e7dffff6ba88e8dc632e38c4b23a8');
    //deployer.deploy(MultiSigWallet, ['0x07dee23b955e7dffff6ba88e8dc632e38c4b23a8'],1);
};
