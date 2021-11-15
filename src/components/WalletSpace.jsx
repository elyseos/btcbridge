import { Box, Button, Stack, Text } from "@chakra-ui/react"
import { IconContext } from 'react-icons'
import { BiWallet, BiCopy } from 'react-icons/bi'
import { AiOutlineDisconnect, AiOutlineWarning } from 'react-icons/ai'
import { UnsupportedChainIdError, useWeb3React } from "@web3-react/core"
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon'
import { injected } from "./wallet/connector"


const WalletSpace = () => {
    const { active, account, activate, deactivate, error } = useWeb3React()

    async function connect() {
        try {
            await activate(injected)
        } catch (ex) {
            console.log(ex)
        }
    }

    async function disconnect() {
        try {
            deactivate()
        } catch (ex) {
            console.log(ex)
        }
    }

    return (
        <Stack direction="row" alignItems="center">
            {error instanceof UnsupportedChainIdError &&
                <Stack direction="row" alignItems="center" bg="red" rounded="lg" py="1" px="3" >
                    <IconContext.Provider value={{ color: 'white' }}>
                        <AiOutlineWarning />
                    </IconContext.Provider>
                    <Text color="white" fontSize="sm">Switch network to <b>Fantom Opera</b></Text>
                </Stack>}
            {/* {!account && <IconContext.Provider value={{ color: 'orange', size: '25px' }}>
                <AiOutlineWarning />
            </IconContext.Provider>} */}
            {error instanceof UnsupportedChainIdError ||
                <Button colorScheme=
                    {active ? "gray" :
                        "purple"} onClick={active ? () => { navigator.clipboard.writeText(account) } : connect}>
                    <Stack alignItems="center" direction="row" >
                        {active ? <Jazzicon diameter={20} seed={jsNumberForAddress(account)} /> : <BiWallet />}
                        <Box><Text isTruncated maxWidth={{ sm: "28", base: "10" }}>{active ? account : 'Connect'}</Text></Box>
                        {active && <BiCopy />}
                    </Stack>
                    {active && <Box alignItems="center"></Box>}
                </Button>
            }
            {active && <Button colorScheme="red" alignItems=" center" onClick={disconnect}><AiOutlineDisconnect /></Button>}
        </Stack >
    )
}

export default WalletSpace
