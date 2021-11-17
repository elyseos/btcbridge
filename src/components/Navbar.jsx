import { Box, Flex, Spacer, Text } from '@chakra-ui/react'
import WalletSpace from './WalletSpace'

const Navbar = () => {
    return (
        <Flex p="3" alignItems="center" minH="16">
            <Box alignItems="center">
                <Text fontSize="xl">ELYS-BTC Bridge</Text>
            </Box>
            <Spacer />
            <WalletSpace />
        </Flex>
    )
}

export default Navbar
