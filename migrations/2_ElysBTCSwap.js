const SwapContract = artifacts.require("ElysBTCSwap");

module.exports = function (deployer) {
  deployer.deploy(SwapContract);
};
