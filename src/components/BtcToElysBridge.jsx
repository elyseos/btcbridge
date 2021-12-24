import { useRef, useState, useEffect } from 'react'
import { Box, Container, Link, Stack } from "@chakra-ui/layout"
import { Text, Button, ButtonGroup, Input, Image, Spinner, Flex, useToast, useColorModeValue } from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { BsArrowUpRight } from 'react-icons/bs'
import { useWeb3React } from "@web3-react/core"
import { ethers } from 'ethers'
import { Bitcoin, Fantom } from "@renproject/chains"
import RenJS from "@renproject/ren";
import WAValidator from 'multicoin-address-validator'
import {
    ELYS_CONTRACT_ADDRESS,
    FTM_CONTRACT_ADDRESS,
    HYPER_ROUTER_ADDRESS,
    RENBTC_CONTRACT__ADDRESS,
    SWAP_CONTRACT_ADDRESS,
    ZOO_ROUTER_ADDRESS,
    routerAbi, tokenAbi
} from '../bridge_constants'
import swapArtifact from '../artifacts/contracts/ELYSBTCSwap.sol/ELYSBTCSwap.json'
let swapAbi = swapArtifact.abi

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

    const [bridgeTxHash, setBridgeTxHash] = useState([null, null])

    const [
        REN_WAITING,
        REN_GATEWAY_SHOW
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
                console.log("BTCToELYSSwap Event:", user, BTCin, ELYSout, out)

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
        let value = elysOut.toNumber()
        if (elysOut === null) {
            console.log("Error: elysOut is null, it shouldn't happen")
            return
        }

        setTransactionStage(TS_CONFIRM_TX)
        const burnAndRelease = await renJS.burnAndRelease({
            // Send BTC from Fantom back to the Bitcoin blockchain.
            asset: "BTC",
            to: Bitcoin().Address(btcAddress),
            from: Fantom(library).Account({ address: account, value }),
        });


        let confirmations = 0;
        await burnAndRelease
            .burn()
            // Fantom transaction confirmations.
            .on("confirmation", (confs) => {
                setBridgeStage(REN_TX_ON_RENVM)
                console.log(confs)
                confirmations = confs;
            })
            // Print Fantom transaction hash.
            .on("transactionHash", (txHash) => {
                setTransactionStage(TS_REN_BRIDGE_PROCESSING)
                setBridgeStage(REN_TX_ON_FTM)
                txStatusToast({
                    title: "Transaction submitted on Fantom",
                    description: <>View on <Link href={`https://ftmscan.com/tx/${txHash}`} isExternal>
                        explorer<ExternalLinkIcon mx="2px" />
                    </Link></>,
                    status: "info",
                    duration: 15000,
                    isClosable: true,
                })
                console.log(`FTM txHash: ${txHash}`)
                setBridgeTxHash([txHash, bridgeTxHash[1]])
            });

        await burnAndRelease
            .release()
            // Print RenVM status - "pending", "confirming" or "done".
            .on("status", (status) => {
                (status === "executing") && setBridgeStage(REN_EXEC)
                status === "confirming"
                    ? console.log(`${status} (${confirmations}/51)`)
                    : console.log(status)
            })
            // Print RenVM transaction hash
            .on("txHash", (txHash) => {
                setBridgeStage(REN_EXEC)
                txStatusToast({
                    title: "Transaction confirmed on RenVM",
                    description: <>View on <Link href={`https://explorer.renproject.io/#/tx/${txHash}`} isExternal>
                        explorer<ExternalLinkIcon mx="2px" />
                    </Link></>,
                    status: "info",
                    duration: 15000,
                    isClosable: true,
                })
                console.log(`RenVM txHash: ${txHash}`)
                setBridgeTxHash([bridgeTxHash[0], txHash])
            }).catch((e) => {
                console.log(e)
                setTransactionStage(TS_SWAP_ELYS_RENBTC)
                setBridgeStage(REN_TX_ON_RENVM)
                txStatusToast({
                    title: e.toString(),
                    status: "error",
                    duration: 15000,
                    isClosable: true,
                })
            });

        setBridgeStage(REN_TX_ON_BTC) // give restart button
        txStatusToast({
            title: "🎉 Transaction submitted on Bitcoin",
            description: <>View on <Link href={`https://live.blockcypher.com/btc/address/${btcAddress}`} isExternal>
                explorer<ExternalLinkIcon mx="2px" />
            </Link></>,
            status: "success",
            duration: 15000,
            isClosable: true,
        })
        console.log(`Withdrew ${value} BTC to ${btcAddress}.`);
    };

    //----------------------------------ACTION BUTTON MANAGEMENT----------------------------------
    // CHANGES ACTION BUTTON CONTENT BASED ON TRANSACTION-STATE
    const getActionButtonState = () => {
        if (transactionStage === TS_WALLET_DISCONNECTED)
            return <Text>Connect Wallet</Text>
        else if (transactionStage === TS_APPROVE_ELYS)
            return <Text>Approve ELYS</Text>
        else if (transactionStage === TS_SWAP_ELYS_RENBTC)
            return <Text>Swap to renBTC</Text>
        else if ((transactionStage === TS_REN_BRIDGE) && (elysOut === null))
            return <Stack direction="row"><Spinner color="white" /> <Text>Fetching renBTC amount</Text></Stack>
        else if (transactionStage === TS_REN_BRIDGE)
            return <Text>Bridge BTC</Text>
        else if (transactionStage === TS_CONFIRM_TX)
            return <Stack direction="row"><Spinner color="white" /> <Text>Confirm in your wallet</Text></Stack>
        else if (transactionStage === TS_TX_CONFIRM_WAIT)
            return <Stack direction="row"><Spinner color="white" /> <Text>Waiting for confirmation</Text></Stack>
        else if (transactionStage === TS_REN_BRIDGE_PROCESSING) {
            if (bridgeStage === REN_TX_ON_FTM)
                return <Stack direction="row"><Spinner color="white" /> <Text>Transaction on FTM</Text></Stack>
            if (bridgeStage === REN_TX_ON_RENVM)
                return <Stack direction="row"><Spinner color="white" /> <Text>Transaction on RenVM</Text></Stack>
            if (bridgeStage === REN_EXEC)
                return <Stack direction="row"><Spinner color="white" /> <Text>Executing</Text></Stack>
            if (bridgeStage === REN_TX_ON_BTC)
                return <Text>Restart</Text>
        }
        else <Text>Invalid State</Text>
    }

    // ENABLES/DISABLES ACTION BUTTON BASED ON TRANSACTION-STATE
    const getActionButtonDisabled = () => {
        if (!account)
            return true
        if (transactionStage === TS_APPROVE_ELYS)
            return false
        else if ((transactionStage === TS_SWAP_ELYS_RENBTC) && (Number(btcIn)))
            return false
        else if ((transactionStage === TS_REN_BRIDGE) && addressValidity && (elysOut != null))
            return false
        else if (transactionStage === TS_CONFIRM_TX)
            return true
        else if (transactionStage === TS_REN_BRIDGE_PROCESSING) {
            if (bridgeStage === REN_TX_ON_BTC)
                return false
            else return true
        }
        else return true
    }

    // SETS ACTION BUTTON ONCLICK BASED ON TRANSACTION-STATE
    const getActionButtonOnClick = () => {
        if (!account)
            return undefined
        if (transactionStage === TS_APPROVE_ELYS)
            return approveElysToContract
        else if (transactionStage === TS_SWAP_ELYS_RENBTC)
            return swapELYSforRenBTC
        else if (transactionStage === TS_REN_BRIDGE)
            return bridgeBTC
        else if (transactionStage === TS_REN_BRIDGE_PROCESSING) {
            if (bridgeStage === REN_TX_ON_BTC)
                return restartProcess
        }
        else return undefined
    }

    return (
        <Container centerContent mt="16" minWidth="72" pb="32">
            <Container centerContent alignItems="center" p="4" maxWidth="container.md" bg={containerBg} border="1px" borderColor="blackAlpha.100" roundedTop="3xl" shadow="lg">
                <Text my="5" textAlign="left" w="full" fontSize="3xl" fontWeight="bold" color={textColor}>Bridge</Text>
                <Stack w="full">
                    <Stack direction="row" alignItems="center" border="1px" borderColor={bordersColor} rounded="md" p="2">
                        {/* <Stack centerContent alignItems="center" bg="white" border="1px" borderColor="gray.200" h="full" w="32" py="2" px="3" rounded="md" direction="row"> */}
                        <Image borderRadius="full" src="https://gitcoin.co/dynamic/avatar/elyseos" bg="white" boxSize="30px" />
                        {/* <Text fontWeight="bold">ELYS</Text> */}
                        {/* </Stack> */}
                        <Input value={btcIn} isTruncated type="number" placeholder="0" textAlign="right" fontWeight="bold" fontSize="xl" onChange={e => setBtcIn(e.target.value)} onKeyDown={e => preventIllegalAmount(e)} color={textColor} />
                    </Stack>
                    <ButtonGroup isAttached variant="outline" w="full">
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setBtcInFromPercent(25)}>25%</Button>
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setBtcInFromPercent(50)}>50%</Button>
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setBtcInFromPercent(75)}>75%</Button>
                        <Button w="full" mr="-px" disabled={!account} onClick={() => setBtcInFromPercent(100)}>100%</Button>
                    </ButtonGroup>
                </Stack>
                <Text w="fit-content" my="2" color={textColor}>{`≈ ${estimatedElysOut} BTC`}</Text>

                {Number(elysOut) ?
                    <Text w="fit-content" mt="2" color={textColor}>
                        {Number(ethers.utils.formatUnits(elysOut, 8)).toFixed(8)} <b>renBTC</b> to transfer.
                    </Text>
                    : <></>
                }
            </Container>

            <Container centerContent alignItems="center" p="4" mt="0.5" maxWidth="container.md" bg={containerBg} border="1px" borderColor="blackAlpha.100" roundedBottom="3xl" shadow="lg">
                <Box w="full" mb="6">
                    <Text mb="1" color={!account ? "blue.400" : "blue"}>Bridge tokens to: </Text>
                    <Input
                        isTruncated
                        isInvalid={!addressValidity && btcAddress.length !== 0}
                        // value={}
                        // onChange={handleChange} // Check validity of address
                        placeholder="Enter destination Bitcoin address"
                        onChange={e => {
                            setBtcAddress(e.target.value)
                            setAddressValidity(validateBitcoinAddress(e.target.value))
                        }}
                        color={textColor}
                    />
                </Box>

                {/* <Stack w="full"> */}
                <Button size="lg" colorScheme="purple" bgGradient="linear(to-r, purple.400, pink.400)" _hover={{
                    bgGradient: "linear(to-r, purple.500, pink.500)",
                }} w="full" rounded="xl" disabled={getActionButtonDisabled()} onClick={getActionButtonOnClick()}>
                    {getActionButtonState()}
                </Button>
            </Container>
            {
                (bridgeStage > REN_WAITING) && <Flex justify="space-between" mt="2" w="full" alignItems="center" p="4" maxWidth="container.md" bg={containerBg} border="1px" borderColor="blackAlpha.100" roundedTop="3xl" shadow="lg">
                    {(bridgeStage >= REN_TX_ON_FTM) && <Link mx="auto" variant="ghost" fontSize="sm" href={`https://ftmscan.com/tx/${bridgeTxHash[0]}`} isExternal>
                        <Stack direction="row" alignItems="center">
                            <Text>FTM Transaction</Text>
                            <BsArrowUpRight />
                        </Stack></Link>}
                    {(bridgeStage >= REN_TX_ON_RENVM) && <Link mx="auto" variant="ghost" fontSize="sm" href={`https://explorer.renproject.io/#/tx/${bridgeTxHash[1]}`} isExternal>
                        <Stack direction="row" alignItems="center">
                            <Text>RenVM Transaction</Text>
                            <BsArrowUpRight />
                        </Stack></Link>}
                </Flex>
            }
            {
                (bridgeStage > REN_WAITING) && <Container centerContent alignItems="center" p="4" maxWidth="container.md" bg="blue" border="1px" borderColor="blackAlpha.100" roundedBottom="3xl" shadow="lg">
                    {(bridgeStage >= REN_TX_ON_BTC) ? <Link mx="auto" variant="ghost" fontSize="sm" href={`https://live.blockcypher.com/btc/address/${btcAddress}`} isExternal>
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
