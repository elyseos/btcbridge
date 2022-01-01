import { useRef, useState, useEffect } from 'react'
import { Box, Container, Link, Stack } from "@chakra-ui/layout"
import { Text, Button, Input, Image, Spinner, Flex, useToast, useColorModeValue } from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { BsArrowUpRight } from 'react-icons/bs'
import { useWeb3React } from "@web3-react/core"
import { ethers } from 'ethers'
import { Bitcoin, Ethereum } from "@renproject/chains"
import RenJS from "@renproject/ren";
import QRCode from "react-qr-code";

import {
    ELYS_CONTRACT_ADDRESS,
    FTM_CONTRACT_ADDRESS,
    HYPER_ROUTER_ADDRESS,
    RENBTC_CONTRACT__ADDRESS,
    // SWAP_CONTRACT_ADDRESS,
    ZOO_ROUTER_ADDRESS,
    routerAbi, tokenAbi
} from '../bridge_constants'
import swapArtifact from '../artifacts/contracts/ELYSBTCSwap.sol/ELYSBTCSwap.json'
let swapAbi = swapArtifact.abi

let SWAP_CONTRACT_ADDRESS = '0xb18595Fd7D2D050c9dDb07c06FfA69BD1244cC1F'
const renJS = new RenJS("testnet", { useV2TransactionFormat: true })

const BtcToElysBridge = () => {
    const { account, library } = useWeb3React()
    const [estimatedElysOut, setEstimateElysOut] = useState(0)

    const containerBg = useColorModeValue("white", "gray.700")
    const bordersColor = useColorModeValue("gray.300", "gray.600")
    const textColor = useColorModeValue(!account ? "gray.400" : "black", "white")
    const zooRouter = useRef(null)
    const hyperRouter = useRef(null)
    const elysContract = useRef(null)
    const swapContract = useRef(null)

    const [btcIn, setBtcIn] = useState('')

    const [btcAddress, setBtcAddress] = useState('')

    const [bridgeTxLinks, setBridgeTxHash] = useState([null, null, null]) // BTC, RenVM, FTM

    const [
        REN_WAITING,
        REN_GATEWAY_SHOW,
        REN_DEPOSIT_DETECTED,
        REN_BTC_LOCK,
        REN_TX_SIGNED,
        REN_FTM_MINT
    ] = [0, 1, 2, 3, 4]
    const [bridgeStage, setBridgeStage] = useState(REN_WAITING)

    const txStatusToast = useToast()
    const [txReceipt, setTxReceipt] = useState(null)
    const [elysOut, setElysOut] = useState(null)

    // ----------------------------------USE-EFFECTs----------------------------------
    // FOR INITIALIZING VALUES ON STATE CHANGE
    useEffect(() => {
        if (account) {
            // INITIALIZE CONTRACTs
            swapContract.current = new ethers.Contract(SWAP_CONTRACT_ADDRESS, swapAbi, library.getSigner())
            elysContract.current = new ethers.Contract(ELYS_CONTRACT_ADDRESS, tokenAbi, library.getSigner())
            zooRouter.current = new ethers.Contract(ZOO_ROUTER_ADDRESS, routerAbi, library.getSigner())
            hyperRouter.current = new ethers.Contract(HYPER_ROUTER_ADDRESS, routerAbi, library.getSigner())

            swapContract.current.on("BTCToELYSSwap", (user, BTCin, ELYSout, _msg, out) => {
                if (user === account) {
                    setElysOut(ELYSout)
                    console.log("EVENT INFO:", user, BTCin, ELYSout, out)
                }
            });

            setBridgeStage(REN_WAITING)
        }

        // IF NO ACCOUNT LOGGED, RESET PARAMS
        else {
            // NULL ALL CONTRACTs
            swapContract.current = null
            elysContract.current = null
            zooRouter.current = null
            hyperRouter.current = null

            // SET OTHER STATES TO DEFAULT
            setBtcIn('')
            setBtcAddress('')
            setElysOut(null)

            setBridgeStage(REN_WAITING)
        }
    }, [account, library])

    // FOR UPDATING ESTIMATED ELYS OUT
    useEffect(() => {
        const updateEstimatedElys = async () => {
            let btcInputValue = Number(btcIn)
            if (btcInputValue === 0) { // Protect from Uniswap Insufficient Amount error
                setEstimateElysOut('0')
                return
            } else btcInputValue = String(btcIn)

            if (account == null) {
                return
            }

            let ftmOut = (await hyperRouter.current.getAmountsOut(ethers.utils.parseUnits(btcInputValue, 8), [RENBTC_CONTRACT__ADDRESS, FTM_CONTRACT_ADDRESS]))[1]
            let elysOut = (await zooRouter.current.getAmountsOut(ftmOut, [FTM_CONTRACT_ADDRESS, ELYS_CONTRACT_ADDRESS]))[1]
            setEstimateElysOut(ethers.utils.formatUnits(elysOut, 5))
        }

        updateEstimatedElys()
    }, [btcIn])

    // TRANSACTION SUCCESSFUL TOAST
    useEffect(() => {
        console.log("TxReceipt:", txReceipt)
        if (txReceipt) {
            txStatusToast({
                title: "😄 Transaction Successful",
                description: "Transaction has been successful. Continue on!",
                status: "success",
                duration: 9000,
                isClosable: true,
            })
        }
    }, [txReceipt])

    // ----------------------------------INPUT CONTROL AND CHECKING----------------------------------
    // PREVENTS ILLEGAL INPUT IN ELYS AMOUNT
    const preventIllegalAmount = (e) => {
        if ((e.key === '-') || (e.key === '+') || (e.key === 'e'))
            e.preventDefault()
        if ((e.target.value.indexOf('.') !== -1) && (e.target.value.length - e.target.value.indexOf('.') > 8) && (!isNaN(e.key)))
            e.preventDefault()
    }

    // CHECK IF TRANSACTION MINED
    const isTransactionMined = async (transactionHash) => {
        const txReceipt = await library.getTransactionReceipt(transactionHash);
        if (txReceipt && txReceipt.blockNumber) {
            return txReceipt;
        }
    }

    // CHECK IF TRANSACTION MINED REPEATEDLY
    const continuousCheckTransactionMined = async (transactionHash, txStage) => {
        let txReceipt = await isTransactionMined(transactionHash)
        if (txReceipt) {
            setTxReceipt(txReceipt)
        }
        else setTimeout(continuousCheckTransactionMined(transactionHash, txStage), 1000)
    }

    // RAISE TRANSACTION SENT TOAST
    const raiseTxSentToast = (txHash) => {
        txStatusToast({
            title: "⏲️ Transaction Sent",
            description: <>View on <Link href={`https://ftmscan.com/tx/${txHash}`} isExternal>
                explorer<ExternalLinkIcon mx="2px" />
            </Link></>,
            status: "info",
            duration: 9000,
            isClosable: true,
        })
    }

    // BRIDGE BTC TO FANTOM
    const bridgeBTC = async () => {
        const mint = await renJS.lockAndMint({
            // Send BTC from the Bitcoin blockchain to the Ethereum blockchain.
            asset: "BTC",
            from: Bitcoin(),
            to: Ethereum(library).Contract({
                sendTo: SWAP_CONTRACT_ADDRESS,

                contractFn: "swapBTCToELYS",

                contractParams: [
                    {
                        name: "_user",
                        type: "address",
                        value: account,
                    },
                ],
            }),
        });

        console.log("the fn called")
        setBtcAddress(mint.gatewayAddress)
        setBridgeStage(REN_GATEWAY_SHOW)

        mint.on("deposit", async (deposit) => {
            const hash = deposit.txHash();
            console.log("again deposit event")
            const depositLog = (msg) => {
                let btcTxUrl = Bitcoin.utils.transactionExplorerLink(
                    deposit.depositDetails.transaction,
                    "testnet"
                )
                setBridgeTxHash([btcTxUrl, null, null]) // Bitcoin Tx URL
                setBridgeTxHash([bridgeTxLinks[0], `https://explorer.renproject.io/#/tx/${hash}`, null]) // RenVM Tx Url

                if (deposit.status === 'detected') {
                    setBridgeStage(REN_DEPOSIT_DETECTED)
                    txStatusToast({
                        title: `BTC deposit detected`,
                        description: <>View on <Link href={btcTxUrl} isExternal>
                            explorer<ExternalLinkIcon mx="2px" />
                        </Link></>,
                        status: "info",
                        duration: 9000,
                        isClosable: true,
                    })
                }
                console.log(
                    `BTC deposit: ${btcTxUrl}\n
                    RenVM Hash: ${hash}\n
                    Status: ${deposit.status}\n
                    ${msg}`
                )
            };

            await deposit
                .confirmed()
                .on("target", (target) => depositLog(`0/${target} confirmations`))
                .on("confirmation", (confs, target) =>
                    depositLog(`${confs}/${target} confirmations`)
                );

            await deposit
                .signed()
                // Print RenVM status - "pending", "confirming" or "done".
                .on("status", (status) => {
                    txStatusToast({
                        title: `RenVM: Transaction ${status}`,
                        description: <>View on <Link href={bridgeTxLinks[1]} isExternal>
                            explorer<ExternalLinkIcon mx="2px" />
                        </Link></>,
                        status: status === "done" ? "success" : "info",
                        duration: 9000,
                        isClosable: true,
                    })
                    depositLog(`Status: ${status}`)
                });

            await deposit
                .mint()
                // Print Ethereum transaction hash.
                .on("transactionHash", (txHash) => {
                    setBridgeTxHash([bridgeTxLinks[0], bridgeTxLinks[1], `https://ftmscan.com/tx/${txHash}`]) // FTM Tx Url
                    console.log(`Ethereum transaction: ${String(txHash)}\nSubmitting...`)
                });

            setBridgeStage(REN_GATEWAY_SHOW)
            txStatusToast({
                title: `ELYS deposited`,
                description: <>View on <Link href={bridgeTxLinks[2]} isExternal>
                    explorer<ExternalLinkIcon mx="2px" />
                </Link></>,
                status: "success",
                duration: 9000,
                isClosable: true,
            })
            console.log(`Deposited BTC.`);
        });
    };

    //----------------------------------ACTION BUTTON MANAGEMENT----------------------------------
    // CHANGES ACTION BUTTON CONTENT BASED ON TRANSACTION-STATE
    const getActionButtonState = () => {
        if (bridgeStage === REN_WAITING)
            return <Text>Get Gateway Address</Text>
        else if (bridgeStage === REN_GATEWAY_SHOW)
            return <Text>Waiting for BTC Deposit</Text>
        else if (bridgeStage === REN_DEPOSIT_DETECTED)
            return <Stack direction="row"><Spinner color="white" /><Text>BTC deposit detected</Text></Stack>
        else if (bridgeStage === REN_BTC_LOCK)
            return <Stack direction="row"><Spinner color="white" /><Text>Waiting for ELYS Mint</Text></Stack>
        else if (bridgeStage === REN_FTM_MINT)
            return <Stack direction="row"><Spinner color="white" /><Text>Converting to ELYS</Text></Stack>
        else <Text>Invalid State</Text>
    }

    // ENABLES/DISABLES ACTION BUTTON BASED ON TRANSACTION-STATE
    const getActionButtonDisabled = () => {
        if (!account)
            return true
        if (bridgeStage === REN_WAITING)
            return false
        else if (bridgeStage === REN_FTM_MINT)
            return false
        else return true
    }

    // SETS ACTION BUTTON ONCLICK BASED ON TRANSACTION-STATE
    const getActionButtonOnClick = () => {
        if (!account)
            return undefined
        if (bridgeStage === REN_WAITING)
            return bridgeBTC
        else if (bridgeStage === REN_FTM_MINT)
            return () => setBridgeStage(REN_GATEWAY_SHOW)
    }

    return (
        <Container centerContent mt="16" minWidth="72" pb="32">
            <Container centerContent alignItems="center" p="4" maxWidth="container.md" bg={containerBg} border="1px" borderColor="blackAlpha.100" roundedTop="3xl" shadow="lg">
                <Text my="5" textAlign="left" w="full" fontSize="3xl" fontWeight="bold" color={textColor}>Bridge</Text>
                <Stack w="full">
                    <Stack direction="row" alignItems="center" border="1px" borderColor={bordersColor} rounded="md" p="2">
                        <Image borderRadius="full" src="https://gitcoin.co/dynamic/avatar/elyseos" bg="white" boxSize="30px" />
                        <Input value={btcIn} isTruncated type="number" placeholder="0" textAlign="right" fontWeight="bold" fontSize="xl" onChange={e => setBtcIn(e.target.value)} onKeyDown={e => preventIllegalAmount(e)} color={textColor} />
                    </Stack>
                </Stack>
                <Text w="fit-content" my="2" color={textColor}>{`≈ ${estimatedElysOut} ELYS`}</Text>
            </Container>

            <Container centerContent alignItems="center" p="4" mt="0.5" maxWidth="container.md" bg={containerBg} border="1px" borderColor="blackAlpha.100" roundedBottom="3xl" shadow="lg">
                {btcAddress && <>
                    <Text fontWeight={'bold'}>Deposit BTC at:</Text>
                    <Text backgroundColor={'beige'} py="0.5" px="1.5" rounded={'lg'}>{btcAddress}</Text>
                    <Box pb="10" pt="3"><QRCode value={btcAddress} /></Box>
                </>}
                <Button size="lg" colorScheme="purple" bgGradient="linear(to-r, purple.400, pink.400)" _hover={{
                    bgGradient: "linear(to-r, purple.500, pink.500)",
                }} w="full" rounded="xl" disabled={getActionButtonDisabled()} onClick={getActionButtonOnClick()}>
                    {getActionButtonState()}
                </Button>
            </Container>
            {
                (bridgeStage > REN_WAITING) && <Flex justify="space-between" mt="2" w="full" alignItems="center" p="4" maxWidth="container.md" bg={containerBg} border="1px" borderColor="blackAlpha.100" roundedTop="3xl" shadow="lg">
                    {(bridgeStage >= REN_WAITING) && <Link mx="auto" variant="ghost" fontSize="sm" href={`https://ftmscan.com/tx/${bridgeTxLinks[0]}`} isExternal>
                        <Stack direction="row" alignItems="center">
                            <Text>FTM Transaction</Text>
                            <BsArrowUpRight />
                        </Stack></Link>}
                    {(bridgeStage >= REN_WAITING) && <Link mx="auto" variant="ghost" fontSize="sm" href={bridgeTxLinks[1]} isExternal>
                        <Stack direction="row" alignItems="center">
                            <Text>Bitcoin Transaction</Text>
                            <BsArrowUpRight />
                        </Stack></Link>}
                </Flex>
            }
            {
                (bridgeStage > REN_WAITING) && <Container centerContent alignItems="center" p="4" maxWidth="container.md" bg="blue" border="1px" borderColor="blackAlpha.100" roundedBottom="3xl" shadow="lg">
                    {(bridgeStage >= REN_WAITING) ? <Link mx="auto" variant="ghost" fontSize="sm" href={`https://live.blockcypher.com/btc/address/${btcAddress}`} isExternal>
                        <Stack direction="row" alignItems="center">
                            <Text color="white">View transaction on Bitcoin</Text>
                            <BsArrowUpRight color='white' />
                        </Stack></Link> : <Spinner color="white" mx="auto" />}
                </Container>
            }
        </Container >
    )
}

export default BtcToElysBridge
