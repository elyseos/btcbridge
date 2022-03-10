# ELYS-BTC Bridge

*Project under development*

-------------
Test the dapp [here](https://elysbtc.netlify.app/).

An easy-to-use dapp to bridge ELYS token *(Fantom)* as Bitcoin to the Bitcoin Mainnet and back again.

Requires Metamask installed to use.

The bridge uses SpookySwap, Curve.fi and RenProject underneath to facilitate the bridging. 
The steps involved in bridging ELYS to BTC are:
1. Swap ELYS->RenBTC using our deployed swap contract.
2. Bridge RenBTC to Bitcoin Mainnet.

**Note**: ELYS converted to RenBTC, is stored on the user's wallet. If the user exits the process midway, he can bridge the RenBTC using [RenBridge](https://bridge.renproject.io).

To bridge it back, the following steps are involved:
1. Generate the BTC deposit address.
2. Send BTC to the given address and wait for confirmations *(takes about 30 mins)*.
3. Sign a single transaction for minting on Fantom and swapping to ELYS.

Swap contract deployed at [0x9D2646e8318665Ebaecf58Fa10D0F80417585fBF](https://ftmscan.com/address/0x9D2646e8318665Ebaecf58Fa10D0F80417585fBF).
