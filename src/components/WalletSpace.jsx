import { Box, Button, ButtonGroup, Stack, Text } from "@chakra-ui/react"
import { BiWallet } from 'react-icons/bi'
import { AiOutlineDisconnect } from 'react-icons/ai'
import { useWeb3React } from "@web3-react/core"
import { injected } from "./wallet/connector"


const WalletSpace = () => {
    const { active, account, library, connector, activate, deactivate } = useWeb3React()

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
        <Stack direction="row">
            <Button colorScheme={active ? "gray" : "blue"} size="sm" onClick={connect}>
                <Stack alignItems="center" direction="row" >
                    <BiWallet />
                    <Box><Text fontSize="xs" isTruncated maxWidth="28">{active ? account : 'Connect'}</Text></Box>
                </Stack>
                {active && <Box alignItems="center"></Box>}
            </Button>
            {active && <Button colorScheme="red" size="sm" alignItems=" center" onClick={disconnect}><AiOutlineDisconnect /></Button>}
        </Stack >
    )
}

export default WalletSpace
