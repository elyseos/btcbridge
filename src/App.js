import { useColorMode, useColorModeValue } from "@chakra-ui/color-mode";
import { Container, Square } from "@chakra-ui/layout";
import BridgeMain from "./components/BridgeMain"
import Navbar from "./components/Navbar"
import { BiSun, BiMoon } from 'react-icons/bi'

function App() {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <div className="App" style={{ height: "100vh", backgroundImage: useColorModeValue("url(./background-gradient-light.png)", "url(./background-gradient-dark.png)"), backgroundSize: "cover", backgroundPosition: "center" }}>
      <Navbar />
      <BridgeMain />
      <Square onClick={toggleColorMode} position="fixed" bottom="5" right="5">{colorMode === 'light' ? <BiSun size="30px" /> : <BiMoon size="30px" />}</Square>
    </div >
  );
}

export default App;
