const RVXToken = artifacts.require("RVXToken");

module.exports = function(deployer) {
  deployer.deploy(RVXToken);
};
