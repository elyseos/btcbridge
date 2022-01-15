import ElysToBtcBridge from "./components/ElysToBtcBridge"
import BtcToElysBridge from "./components/BtcToElysBridge"
import Navbar from "./components/Navbar"

function App() {

  return (
    <div className="App">
      <Navbar />
      <ElysToBtcBridge />
      <BtcToElysBridge />
    </div >
  );
}

export default App;
