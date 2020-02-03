var RVXToken = artifacts.require("./RVXToken.sol");
module.exports = function(deployer) {
    deployer.deploy(RVXToken);
};