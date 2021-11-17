# ELYS-BTC Bridge

*Project under development*

-------------
Test the dapp [here](https://elysbtc.netlify.app/).

An easy-to-use dapp to bridge ELYS token *(Fantom)* as Bitcoin to the Bitcoin Mainnet in the following steps:
1. Converts **ELYS** to **WFTM**
2. Converts **WFTM** to **RenBTC**
3. Bridges **RenBTC** to Bitcoin Mainnet.

Requires Metamask installed to use.

**Note**: ELYS converted to WFTM, is stored in the contract itself and not on the user's wallet. If the user exits the process midway, loading the app will give the user option to either withdraw the WFTM, or continue on.

In case the process is disrupted before bridging, RenBridge can be used as the renBTC exists on the user's wallet.

Swap contract deployed at [0x924eE9804f297A3225ed39FdF8162beB0D9a9F21](https://ftmscan.com/address/0x924eE9804f297A3225ed39FdF8162beB0D9a9F21).
