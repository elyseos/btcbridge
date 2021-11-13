import { useRef, useState, useEffect } from 'react'
import { Box, Container, Stack } from "@chakra-ui/layout"
import { Text, Button, ButtonGroup, Input, Image } from '@chakra-ui/react'
import { useWeb3React } from "@web3-react/core"
import { ethers } from 'ethers'
import { Bitcoin, Fantom } from "@renproject/chains"
import RenJS from "@renproject/ren";
import { validate } from 'bitcoin-address-validation';

const BridgeMain = () => {
    const { account, library } = useWeb3React()
    const [estimatedBtcOut, setEstimateBtcOut] = useState(0)
    const zooRouter = useRef(null)
    const hyperRouter = useRef(null)
    const routerAbi = useRef(null)
    const tokenAbi = useRef(null)

    const [elysIn, setElysIn] = useState(0)
    const elysBalance = useRef(0)
    const btcAddress = useRef(null)

    const getElysBalance = async () => {
        let elysContract = new ethers.Contract('0xd89cc0d2A28a769eADeF50fFf74EBC07405DB9Fc', tokenAbi.current, library.getSigner())
        let balance = await elysContract.balanceOf(account)
        elysBalance.current = ethers.utils.formatUnits(balance, 5)
    }

    const bridgeBTC = async (amount) => {
        const renJS = new RenJS("testnet", { useV2TransactionFormat: true })
        const burnAndRelease = await renJS.burnAndRelease({
            // Send BTC from Fantom back to the Bitcoin blockchain.
            asset: "BTC",
            to: Bitcoin().Address(btcAddress),
            from: Fantom(library).Address(account),
        });

        let confirmations = 0;
        await burnAndRelease
            .burn()
            // Fantom transaction confirmations.
            .on("confirmation", (confs) => {
                confirmations = confs;
            })
            // Print Fantom transaction hash.
            .on("transactionHash", (txHash) => console.log(`Fantom txHash: ${txHash}`));

        await burnAndRelease
            .release()
            // Print RenVM status - "pending", "confirming" or "done".
            .on("status", (status) =>
                status === "confirming"
                    ? console.log(`${status} (${confirmations}/15)`)
                    : console.log(status)
            )
            // Print RenVM transaction hash
            .on("txHash", (txHash) => console.log(`RenVM txHash: ${txHash}`));

        console.log(`Withdrew ${amount} BTC to ${btcAddress}.`);
    };

    useEffect(() => {
        routerAbi.current = [
            'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)'
        ]
        tokenAbi.current = [
            'function balanceOf(address _owner) public view returns(uint256 balance)'
        ]
    }, [])

    useEffect(() => {
        if (account) {
            zooRouter.current = new ethers.Contract('0x40b12a3E261416fF0035586ff96e23c2894560f2', routerAbi.current, library.getSigner())
            hyperRouter.current = new ethers.Contract('0x53c153a0df7E050BbEFbb70eE9632061f12795fB', routerAbi.current, library.getSigner())
            getElysBalance()
        }
        else {
            zooRouter.current = null
            hyperRouter.current = null
        }
    }, [account, library])

    useEffect(() => {
        const updateEstimatedBtc = async () => {
            let elysInputValue = Number(elysIn)
            if (elysInputValue === 0) { // Protect from Uniswap Insufficient Amount error
                setEstimateBtcOut('0')
                return
            } else elysInputValue = String(elysIn)

            if (account == null) {
                console.log("Wallet not connected. Trigger a modal!")
                return
            }

            let ftmOut = (await zooRouter.current.getAmountsOut(ethers.utils.parseUnits(elysInputValue, 5), ['0xd89cc0d2A28a769eADeF50fFf74EBC07405DB9Fc', '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83']))[1]
            let renBtcOut = (await hyperRouter.current.getAmountsOut(ftmOut, ['0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83', '0xdbf31df14b66535af65aac99c32e9ea844e14501']))[1]
            setEstimateBtcOut(ethers.utils.formatUnits(renBtcOut.mul(9985).div(10000), 8)) // adjust for RenVM fees
        }
        updateEstimatedBtc()
    }, [elysIn])

    const preventIllegalAmount = (e) => {
        if ((e.key === '-') || (e.key === '+') || (e.key === 'e'))
            e.preventDefault()
        if ((e.target.value.indexOf('.') !== -1) && (e.target.value.length - e.target.value.indexOf('.') > 5) && (!isNaN(e.key)))
            e.preventDefault()
    }

    const setElysInFromPercent = (percent) => {
        setElysIn(String(Number(elysBalance.current) * (percent / 100)))
    }

    const validateBitcoinAddress = (address) => {
        if (validate(address, 'mainnet'))
            return true
        else return false
    }

    return (
        <Container centerContent>
            <Container centerContent alignItems="center" p="4" mt="10" minWidth="80" maxWidth="container.md" bg="white" border="1px" borderColor="blackAlpha.100" roundedTop="3xl" shadow="lg">
                <Text my="5" textAlign="left" w="full" fontSize="3xl" fontWeight="bold">Bridge</Text>
                <Stack w="full">
                    <Stack direction="row" alignItems="center" border="1px" borderColor="gray.300" rounded="md" p="2">
                        {/* <Stack centerContent alignItems="center" bg="white" border="1px" borderColor="gray.200" h="full" w="32" py="2" px="3" rounded="md" direction="row"> */}
                        <Image borderRadius="full" src="https://gitcoin.co/dynamic/avatar/elyseos" bg="white" boxSize="30px" />
                        {/* <Text fontWeight="bold">ELYS</Text> */}
                        {/* </Stack> */}
                        <Input value={elysIn} isTruncated type="number" placeholder="0" textAlign="right" fontWeight="bold" fontSize="xl" onChange={e => setElysIn(e.target.value)} onKeyDown={e => preventIllegalAmount(e)} />
                    </Stack>
                    <ButtonGroup isAttached variant="outline" w="full">
                        <Button w="full" mr="-px" onClick={() => setElysInFromPercent(25)}>25%</Button>
                        <Button w="full" mr="-px" onClick={() => setElysInFromPercent(50)}>50%</Button>
                        <Button w="full" mr="-px" onClick={() => setElysInFromPercent(75)}>75%</Button>
                        <Button w="full" mr="-px" onClick={() => setElysInFromPercent(100)}>100%</Button>
                    </ButtonGroup>
                </Stack>
                <Text w="fit-content" my="2">{`≈ ${estimatedBtcOut} BTC`}</Text>
            </Container>

            <Container centerContent alignItems="center" p="4" mt="0.5" minWidth="80" maxWidth="container.md" bg="white" border="1px" borderColor="blackAlpha.100" roundedBottom="3xl" shadow="lg">
                <Box w="full" mb="6">
                    <Text mb="1" color="blue">Bridge tokens to: </Text>
                    <Input
                        isTruncated
                        // value={}
                        // onChange={handleChange} // Check validity of address
                        placeholder="Enter destination Bitcoin address"
                        onChange={e => btcAddress.current = e.target.value}
                    />
                </Box>

                <Stack w="full">
                    <Button size="lg" colorScheme="purple" bgGradient="linear(to-r, purple.400, pink.400)" _hover={{
                        bgGradient: "linear(to-r, purple.500, pink.500)",
                    }} w="full" rounded="xl">
                        Approve ELYS
                    </Button>

                    {/* <Stack direction="row">
                        <Button size="lg" colorScheme="orange" bgGradient="linear(to-t, yellow.400, orange.400)" _hover={{
                            bgGradient: "linear(to-r, yellow.500, orange.500)",
                        }} w="full" rounded="xl">
                            Convert To renBTC
                        </Button>

                        <Button size="lg" colorScheme="green" bgGradient="linear(to-t, green.400, green.500)" _hover={{
                            bgGradient: "linear(to-r, green.500, green.600)",
                        }} w="full" rounded="xl">
                            Bridge
                        </Button>
                    </Stack> */}
                </Stack>

            </Container>
        </Container >
    )
}

export default BridgeMain
