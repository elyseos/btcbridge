import { Box, Container, Stack } from "@chakra-ui/layout"
import { Text, Button, ButtonGroup, Input, InputGroup, InputRightAddon } from '@chakra-ui/react'

const BridgeMain = () => {
    return (
        <Container centerContent>
            <Container centerContent alignItems="center" p="4" mt="10" minWidth="80" maxWidth="container.md" bg="white" border="1px" borderColor="blackAlpha.100" rounded="xl" shadow="lg">
                <Text color="gray.300" mb="5">ELYS-BTC Bridge</Text>
                <Stack w="full">
                    <InputGroup>
                        <Input isTruncated type="number" placeholder="0" fontWeight="bold" fontSize="xl" />
                        <InputRightAddon children="ELYS" />
                    </InputGroup>
                    <ButtonGroup color="gray" isAttached variant="outline" w="full">
                        <Button w="full" mr="-px">25%</Button>
                        <Button w="full" mr="-px">50%</Button>
                        <Button w="full" mr="-px">75%</Button>
                        <Button w="full" mr="-px">100%</Button>
                    </ButtonGroup>
                </Stack>
                <Box w="full">
                    <Text color="gray" mb="1" mt="5">Bitcoin Address: </Text>
                    <Input
                        isTruncated
                        // value={""}
                        // onChange={handleChange}
                        placeholder="bc1qxy2kgtygjrsqtzq2n0yrf2493p23kkfjhx0wlh"
                    />
                </Box>
                <Button disabled w="full" my="2">Transfer Funds</Button>

            </Container>

        </Container >
    )
}

export default BridgeMain
