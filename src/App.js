import { useColorModeValue } from "@chakra-ui/color-mode";
import BridgeMain from "./components/BridgeMain"
import Navbar from "./components/Navbar"

function App() {

  return (
    <div className="App" style={{ height: "100%", backgroundImage: useColorModeValue("url(./background-gradient-light.png)", "url(./background-gradient-dark.png)"), backgroundSize: "cover", backgroundPosition: "center" }}>
      <Navbar />
      <BridgeMain />
    </div>
  );
}

export default App;
