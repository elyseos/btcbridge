require("@nomiclabs/hardhat-ethers")
require("@nomiclabs/hardhat-waffle")

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: "https://rpc.ftm.tools/"
      }
    }
  },
  solidity: "0.8.6",
};
